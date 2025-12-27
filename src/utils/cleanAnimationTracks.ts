import * as THREE from 'three';

/**
 * Lọc và xóa các track không hợp lệ khỏi animation clip
 * @param clip - Animation clip cần lọc
 * @param targetScene - Scene chứa các target nodes
 * @returns Animation clip đã được lọc
 */
export function cleanAnimationTracks(
  clip: THREE.AnimationClip,
  targetScene: THREE.Object3D
): THREE.AnimationClip {
  if (!clip || !targetScene) {
    console.warn('cleanAnimationTracks: Missing clip or targetScene');
    return clip;
  }

  const validTracks: THREE.KeyframeTrack[] = [];
  const invalidTracks: string[] = [];

  clip.tracks.forEach((track: THREE.KeyframeTrack) => {
    const trackName = track.name.startsWith('J_Sec') ? track.name : 'Normalized_' + track.name;
    const nodeName = trackName.split('.')[0];

    const targetNode = targetScene.getObjectByName(nodeName);

    if (targetNode) {
      track.name = trackName;
      validTracks.push(track);
    } else {
      invalidTracks.push(trackName);
    }
  });

  if (invalidTracks.length > 0) {
    console.warn(`Removed ${invalidTracks.length} invalid tracks:`, invalidTracks);
  }

  const cleanedClip = new THREE.AnimationClip(clip.name, clip.duration, validTracks);

  return cleanedClip;
}

/**
 * Lọc các track không hợp lệ từ một mảng animation clips
 * @param clips - Mảng các animation clips
 * @param targetScene - Scene chứa các target nodes
 * @returns Mảng clips đã được lọc
 */
export function cleanMultipleAnimationTracks(
  clips: THREE.AnimationClip[],
  targetScene: THREE.Object3D
): THREE.AnimationClip[] {
  return clips.map((clip) => cleanAnimationTracks(clip, targetScene));
}
