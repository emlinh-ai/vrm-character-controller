/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from 'leva'; // <--- Import Leva
import type { VRM } from '@pixiv/three-vrm';

const TARGET_LENGTH_RATIO = 0.7;

const boneNames = {
  chest: ['upperChest', 'chest', 'spine', 'UpperChest', 'Chest', 'Spine'],
  leftHand: ['leftHand', 'LeftHand', 'left_wrist', 'LeftWrist'], 
} as const;

const findBone = (vrm: VRM, names: readonly string[]) => {
  const humanoid: any = (vrm as any)?.humanoid;
  if (!humanoid) return null;
  for (const name of names) {
    const node = humanoid?.getNormalizedBoneNode?.(name) || humanoid?.getBoneNode?.(name);
    if (node) return node;
  }
  return null;
};

interface UseGuitarAttachmentParams {
  vrm: VRM | null;
  enabled?: boolean;
}

export const useGuitarAttachment = ({ vrm, enabled = true }: UseGuitarAttachmentParams) => {
  const guitarGltf = useGLTF('/assets/props/bass_guitar_low_poly_freebie_v02.glb');
  const guitarRef = useRef<THREE.Group | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const leftHandRef = useRef<THREE.Object3D | null>(null);

  // --- BẢNG ĐIỀU KHIỂN DEBUG (DEBUGGER) ---
  const debug = useControls('Chỉnh Đàn Guitar', {
    // 1. Chỉnh vị trí hộp Pivot trên ngực
    pivotPos: { value: [-0.03, -0.09, 0.15], step: 0.01 },
    
    // 2. QUAN TRỌNG: Xoay cây đàn bên trong hộp để sửa trục
    // Bạn kéo 3 thanh này đến khi đàn nằm đúng tư thế
    guitarRotX: { value: -52, min: -180, max: 180, step: 1 }, 
    guitarRotY: { value: -79, min: -180, max: 180, step: 1 },
    guitarRotZ: { value: -37, min: -180, max: 180, step: 1 },
    
    // 3. Scale đàn to nhỏ
    scaleCorrection: { value: 1, min: 0.1, max: 2, step: 0.1 },
    
    // 4. Bật tắt chế độ LookAt tay trái để test
    autoAim: true
  });

  // Apply các thay đổi từ bảng điều khiển vào đàn ngay lập tức
  useFrame(() => {
    if (pivotRef.current && guitarRef.current) {
      // Cập nhật vị trí Pivot (nếu bạn chỉnh)
      // Lưu ý: Đây là ví dụ update realtime, thực tế position pivot set lúc init.
      // Để debug chính xác, ta update trực tiếp vào Mesh con (guitar) offset
      
      // Update góc xoay đàn (Axis Correction)
      guitarRef.current.rotation.set(
        THREE.MathUtils.degToRad(debug.guitarRotX),
        THREE.MathUtils.degToRad(debug.guitarRotY),
        THREE.MathUtils.degToRad(debug.guitarRotZ)
      );
      
      // Scale
      const baseScale = guitarRef.current.userData.initialScale || 1;
      guitarRef.current.scale.setScalar(baseScale * debug.scaleCorrection);
    }

    // Logic xoay theo tay trái
    if (pivotRef.current && leftHandRef.current && debug.autoAim) {
      const targetPos = new THREE.Vector3();
      leftHandRef.current.getWorldPosition(targetPos);
      pivotRef.current.lookAt(targetPos);
    }
  });

  useEffect(() => {
    if (!enabled || !vrm || !guitarGltf?.scene) return;

    let retryHandle: number | null = null;

    const tryAttach = () => {
      const chest = findBone(vrm, boneNames.chest) || vrm.scene;
      const leftHand = findBone(vrm, boneNames.leftHand);
      if (leftHand) leftHandRef.current = leftHand;

      if (!chest) {
        retryHandle = requestAnimationFrame(tryAttach);
        return;
      }

      if (!pivotRef.current) {
        // Init Pivot
        const pivotGroup = new THREE.Group();
        pivotGroup.name = 'Guitar_Pivot_Container';

        // Init Guitar
        const guitarScene = guitarGltf.scene as unknown as THREE.Group;
        const guitar = guitarScene.clone(true);
        guitar.name = 'prop_guitar_mesh';

        // Tính Scale ban đầu (giữ nguyên logic cũ)
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

        // Lưu scale gốc để debug chỉnh to nhỏ
        guitar.userData.initialScale = targetScale;
        guitar.scale.setScalar(targetScale);

        // Gắn vào nhau
        pivotGroup.add(guitar);
        chest.add(pivotGroup);

        // Set vị trí ban đầu của Pivot
        // (Trong lúc debug dùng Leva, sau này chốt số thì sửa vào đây)
        pivotGroup.position.set(debug.pivotPos[0], debug.pivotPos[1], debug.pivotPos[2]);

        pivotRef.current = pivotGroup;
        guitarRef.current = guitar;
      }
    };

    tryAttach();

    return () => {
      if (retryHandle) cancelAnimationFrame(retryHandle);
      if (pivotRef.current) {
        pivotRef.current.parent?.remove(pivotRef.current);
        pivotRef.current = null;
        guitarRef.current = null;
      }
    };
  }, [vrm, guitarGltf, enabled]); // Bỏ debug ra khỏi dependency để ko re-mount liên tục

  return { guitarRef, pivotRef };
};