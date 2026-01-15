/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

const CHEST_OFFSET_FACTOR = new THREE.Vector3(-0.03, -0.066, 0.1);
const CHEST_ROTATION = new THREE.Euler(
  THREE.MathUtils.degToRad(-30),
  THREE.MathUtils.degToRad(-15),
  THREE.MathUtils.degToRad(12)
);

const TARGET_LENGTH_RATIO = 0.7;

const boneNames = {
  chest: ['upperChest', 'chest', 'spine', 'UpperChest', 'Chest', 'Spine'],
  rightHand: ['rightHand', 'RightHand', 'right_wrist', 'RightWrist'],
} as const;

const findBone = (vrm: VRM, names: readonly string[]) => {
  const humanoid: any = (vrm as any)?.humanoid;
  if (!humanoid) return null;

  for (const name of names) {
    const node =
      humanoid?.getNormalizedBoneNode?.(name) ||
      humanoid?.getBoneNode?.(name);
    if (node) return node;
  }
  return null;
};

interface UseGuitarAttachmentParams {
  vrm: VRM | null;
  enabled?: boolean;
}

interface UseGuitarAttachmentReturn {
  guitarRef: React.RefObject<THREE.Group | null>;
}

export const useGuitarAttachment = ({
  vrm,
  enabled = true,
}: UseGuitarAttachmentParams): UseGuitarAttachmentReturn => {
  const guitarGltf = useGLTF('/assets/props/bass_guitar_low_poly_freebie_v02.glb');
  const guitarRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!enabled || !vrm || !guitarGltf?.scene) return;

    let retryHandle: number | null = null;

    const tryAttach = () => {
      const chest = findBone(vrm, boneNames.chest) || vrm.scene;

      if (!chest) {
        retryHandle = requestAnimationFrame(tryAttach);
        return;
      }

      if (!guitarRef.current) {
        const guitarScene = guitarGltf.scene as unknown as THREE.Group;
        const guitar = guitarScene.clone(true);
        guitar.name = 'prop_acoustic_guitar';

        const guitarBox = new THREE.Box3().setFromObject(guitar);
        const guitarSize = new THREE.Vector3();
        guitarBox.getSize(guitarSize);
        const guitarMaxDim = Math.max(guitarSize.x, guitarSize.y, guitarSize.z) || 1;

        const vrmBox = new THREE.Box3().setFromObject(vrm.scene);
        const vrmSize = new THREE.Vector3();
        vrmBox.getSize(vrmSize);
        const vrmHeight = vrmSize.y || 1;

        const targetLength = vrmHeight * TARGET_LENGTH_RATIO;
        const targetScale = targetLength / guitarMaxDim;

        const chestOffsetX = CHEST_OFFSET_FACTOR.x * vrmHeight;
        const chestOffsetY = CHEST_OFFSET_FACTOR.y * vrmHeight;
        const chestOffsetZ = CHEST_OFFSET_FACTOR.z * vrmHeight;

        guitar.position.set(chestOffsetX, chestOffsetY, chestOffsetZ);
        guitar.rotation.copy(CHEST_ROTATION);
        guitar.scale.setScalar(targetScale);
        guitar.visible = false;

        chest.add(guitar as unknown as THREE.Object3D);
        guitarRef.current = guitar;
      }
    };

    tryAttach();

    return () => {
      if (retryHandle) cancelAnimationFrame(retryHandle);
      if (guitarRef.current) {
        guitarRef.current.parent?.remove(guitarRef.current);
        guitarRef.current = null;
      }
    };
  }, [vrm, guitarGltf, enabled]);

  return { guitarRef };
};
