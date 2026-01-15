/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

const FIXED_CHAIR_POSITION: [number, number, number] = [0, -0.09, 0.19];
const FIXED_CHAIR_SCALE = 0.04;

interface UseChairAttachmentParams {
  vrm: VRM | null;
  enabled?: boolean;
  modelUrl?: string;
  rotation?: [number, number, number];
}

export const useChairAttachment = ({
  vrm,
  enabled = true,
  modelUrl = '/assets/props/chair.glb',
  rotation,
}: UseChairAttachmentParams) => {
  const chairGltf = useGLTF(modelUrl);
  const chairRef = useRef<THREE.Group | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!enabled || !vrm || !chairGltf?.scene) return;

    let retryHandle: number | null = null;

    const tryAttach = () => {
      const root = vrm.scene as unknown as THREE.Object3D;
      if (!root) {
        retryHandle = requestAnimationFrame(tryAttach);
        return;
      }

      if (!pivotRef.current) {
        const pivotGroup = new THREE.Group();
        pivotGroup.name = 'Chair_Pivot_Container';

        const chairScene = chairGltf.scene as unknown as THREE.Group;
        const chair = chairScene.clone(true);
        chair.name = 'prop_chair_mesh';

        chair.scale.setScalar(FIXED_CHAIR_SCALE);
        pivotGroup.position.set(
          FIXED_CHAIR_POSITION[0],
          FIXED_CHAIR_POSITION[1],
          FIXED_CHAIR_POSITION[2]
        );

        if (rotation) {
          pivotGroup.rotation.set(rotation[0], rotation[1], rotation[2]);
        }

        pivotGroup.add(chair);
        root.add(pivotGroup);

        pivotRef.current = pivotGroup;
        chairRef.current = chair;
      }
    };

    tryAttach();

    return () => {
      if (retryHandle) cancelAnimationFrame(retryHandle);
      if (pivotRef.current) {
        pivotRef.current.parent?.remove(pivotRef.current);
        pivotRef.current = null;
        chairRef.current = null;
      }
    };
  }, [vrm, chairGltf, enabled, modelUrl, rotation]);

  return { chairRef, pivotRef };
};
