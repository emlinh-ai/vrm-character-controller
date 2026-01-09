import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import type { UseVrmLookAtOptions } from '../types';

/**
 * Hook để điều khiển VRM model nhìn vào camera
 * Sử dụng VRM's built-in LookAt feature
 */
export function useVrmLookAt(vrm: VRM | null, options: UseVrmLookAtOptions = {}) {
  const { enabled = true, smoothness = 0.1 } = options;
  const { camera } = useThree();

  const targetPositionRef = useRef(new THREE.Vector3());
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (vrm?.lookAt) {
      console.log('✅ VRM LookAt feature detected!');
      hasLoggedRef.current = true;
    } else if (vrm && !hasLoggedRef.current) {
      console.warn('⚠️ VRM LookAt not available');
      hasLoggedRef.current = true;
    }
  }, [vrm]);

  useFrame((_, delta) => {
    if (!vrm || !enabled) return;

    if (vrm.lookAt) {
      const cameraPosition = new THREE.Vector3();
      // @ts-ignore
      camera.getWorldPosition(cameraPosition);

      targetPositionRef.current.lerp(cameraPosition, smoothness);
      // @ts-ignore
      vrm.lookAt.lookAt(targetPositionRef.current);
      // @ts-ignore
      vrm.lookAt.update(delta);
    }
  });
}
