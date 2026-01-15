/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { mixamoVRMRigMap } from './mixamoVRMRigMap';
import type { AnimationBodyPart } from '../types';

interface MixamoAsset extends THREE.Group {
  animations: THREE.AnimationClip[];
  getObjectByName(name: string): THREE.Object3D | undefined;
}

const lowerBodyBones = new Set([
  'hips',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'leftToes',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'rightToes',
]);

const upperBodyBones = new Set([
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftThumbMetacarpal',
  'leftThumbProximal',
  'leftThumbDistal',
  'leftIndexProximal',
  'leftIndexIntermediate',
  'leftIndexDistal',
  'leftMiddleProximal',
  'leftMiddleIntermediate',
  'leftMiddleDistal',
  'leftRingProximal',
  'leftRingIntermediate',
  'leftRingDistal',
  'leftLittleProximal',
  'leftLittleIntermediate',
  'leftLittleDistal',
  'rightThumbMetacarpal',
  'rightThumbProximal',
  'rightThumbDistal',
  'rightIndexProximal',
  'rightIndexIntermediate',
  'rightIndexDistal',
  'rightMiddleProximal',
  'rightMiddleIntermediate',
  'rightMiddleDistal',
  'rightRingProximal',
  'rightRingIntermediate',
  'rightRingDistal',
  'rightLittleProximal',
  'rightLittleIntermediate',
  'rightLittleDistal',
]);

const isBoneAllowedForBodyPart = (vrmBoneName: string, bodyPart?: AnimationBodyPart): boolean => {
  if (!bodyPart || bodyPart === 'full') return true;
  if (bodyPart === 'lower') {
    return lowerBodyBones.has(vrmBoneName);
  }
  return upperBodyBones.has(vrmBoneName);
};

export function remapMixamoAnimationToVrm(
  vrm: VRM,
  asset: MixamoAsset,
  bodyPart?: AnimationBodyPart
): THREE.AnimationClip | null {
  let foundClip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
  if (!foundClip) {
    foundClip = asset.animations[0];
  }
  if (!foundClip) return null;
  
  const clip = foundClip.clone();
  const tracks: THREE.KeyframeTrack[] = [];
  const skippedTracks: string[] = [];

  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();
  const _vec3 = new THREE.Vector3();

  // Adjust with reference to hips height
  const hipsNode = asset.getObjectByName('mixamorigHips');
  if (!hipsNode) {
    console.warn('remapMixamoAnimationToVrm: mixamorigHips not found');
    return null;
  }

  const motionHipsHeight = hipsNode.position.y;
  // @ts-ignore
  const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips')?.getWorldPosition(_vec3).y ?? 0;
  // @ts-ignore
  const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
  const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

  clip.tracks.forEach((track: THREE.KeyframeTrack) => {
    const trackSplitted = track.name.split('.');
    const mixamoRigName = trackSplitted[0];
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
    // @ts-ignore
    const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
    const mixamoRigNode = asset.getObjectByName(mixamoRigName);

    if (vrmNodeName != null && mixamoRigNode) {
      const targetNode = vrm.scene.getObjectByName(vrmNodeName);
      if (!targetNode) {
        skippedTracks.push(`${vrmNodeName}.${trackSplitted[1]} (node not found in scene)`);
        return;
      }

      const propertyName = trackSplitted[1];

      // Bỏ các track không thuộc bodyPart yêu cầu
      if (!isBoneAllowedForBodyPart(vrmBoneName, bodyPart)) {
        skippedTracks.push(`${vrmNodeName}.${propertyName} (filtered by bodyPart ${bodyPart})`);
        return;
      }

      mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
      mixamoRigNode.parent?.getWorldQuaternion(parentRestWorldRotation);

      if (track instanceof THREE.QuaternionKeyframeTrack) {
        for (let i = 0; i < track.values.length; i += 4) {
          const flatQuaternion = track.values.slice(i, i + 4);

          _quatA.fromArray(flatQuaternion as unknown as number[]);
          _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
          _quatA.toArray(flatQuaternion as unknown as number[]);

          flatQuaternion.forEach((v: number, index: number) => {
            track.values[index + i] = v;
          });
        }

        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times as unknown as number[],
            Array.from(track.values).map((v: number, i: number) =>
              vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v
            )
          )
        );
      } else if (track instanceof THREE.VectorKeyframeTrack) {
        // Giữ nguyên root motion cho xương hông (hips)
        if (vrmBoneName === 'hips') {
          const value = Array.from(track.values).map((v: number, i: number) => {
            // i % 3: 0 = x, 1 = y, 2 = z
            const axis = i % 3;
            return (vrm.meta?.metaVersion === '0' && axis !== 1 ? -v : v) * hipsPositionScale;
          });

          tracks.push(
            new THREE.VectorKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times as unknown as number[],
              value
            )
          );
        }
      }
    } else {
      skippedTracks.push(`${mixamoRigName}.${trackSplitted[1]} (no VRM bone mapping)`);
    }
  });

  if (skippedTracks.length > 0) {
    console.warn(`remapMixamoAnimationToVrm: Skipped ${skippedTracks.length} tracks:`, skippedTracks);
  }

  return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
}
