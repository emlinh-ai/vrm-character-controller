/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { remapMixamoAnimationToVrm } from '../utils/remapMixamoAnimationToVrm';
import { cleanAnimationTracks } from '../utils/cleanAnimationTracks';
import { getAnimationById, getPreloadAnimations } from '../constants/animation-registry';
import type { AnimationCache, LoadingState, UseVrmAnimationLoaderReturn } from '../types';

/**
 * Trims an animation clip to a specific frame range
 */
const trimAnimationClip = (
  clip: THREE.AnimationClip,
  startFrame?: number,
  endFrame?: number,
  fps: number = 30
): THREE.AnimationClip => {
  if (startFrame === undefined && endFrame === undefined) {
    return clip;
  }

  const startTime = startFrame !== undefined ? startFrame / fps : 0;
  const endTime = endFrame !== undefined ? endFrame / fps : clip.duration;

  const trimmedTracks = clip.tracks.map((track: THREE.KeyframeTrack) => {
    const times = (track as any).times as number[];
    const values = (track as any).values as number[];
    const valueSize = track.getValueSize();

    const newTimes: number[] = [];
    const newValues: number[] = [];

    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      if (time >= startTime && time <= endTime) {
        newTimes.push(time - startTime);
        const startIdx = i * valueSize;
        for (let j = 0; j < valueSize; j++) {
          newValues.push(values[startIdx + j]);
        }
      }
    }

    if (newTimes.length === 0) {
      newTimes.push(0);
      for (let j = 0; j < valueSize; j++) {
        newValues.push(values[j]);
      }
    }

    const TrackConstructor = track.constructor as any;
    return new TrackConstructor(track.name, newTimes, newValues);
  });

  const trimmedClip = new THREE.AnimationClip(
    clip.name,
    endTime - startTime,
    trimmedTracks
  );

  return trimmedClip;
};

/**
 * Custom hook for lazy loading VRM animations
 * Loads animations on-demand and caches them for reuse
 * Automatically preloads critical animations defined in registry
 */
export const useVrmAnimationLoader = (
  vrm: VRM | null,
  registry: Record<string, any>
): UseVrmAnimationLoaderReturn => {
  const cacheRef = useRef<AnimationCache>({});
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [preloadedAnimations, setPreloadedAnimations] = useState<string[]>([]);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [isCriticalAnimationReady, setIsCriticalAnimationReady] = useState<boolean>(false);

  const updateLoadingState = useCallback(
    (animId: string, state: LoadingState[string]) => {
      setLoadingStates((prev) => ({ ...prev, [animId]: state }));
    },
    []
  );

  const loadAnimation = useCallback(
    async (animationId: string): Promise<THREE.AnimationClip | null> => {
      if (cacheRef.current[animationId]) {
        return cacheRef.current[animationId];
      }

      if (loadingStates[animationId] === 'loading') {
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (loadingStates[animationId] !== 'loading') {
              clearInterval(checkInterval);
              resolve(cacheRef.current[animationId]);
            }
          }, 100);
        });
      }

      const animDef = getAnimationById(registry, animationId);
      if (!animDef) {
        console.warn(`Animation ${animationId} not found in registry`);
        return null;
      }

      if (!vrm) {
        console.warn('VRM not loaded yet');
        return null;
      }

      updateLoadingState(animationId, 'loading');

      try {
        let clip: THREE.AnimationClip | null = null;

        if (animDef.type === 'fbx') {
          const fbxLoader = new FBXLoader();
          const fbx = await new Promise<any>((resolve, reject) => {
            fbxLoader.load(
              animDef.path,
              (data) => resolve(data),
              undefined,
              (error) => reject(error)
            );
          });
          clip = remapMixamoAnimationToVrm(vrm, fbx, animDef.bodyPart);
          if (!clip) {
            throw new Error(`Failed to load animation ${animationId}: clip is null`);
          }
          clip.name = animationId;
          clip = trimAnimationClip(clip, animDef.startFrame, animDef.endFrame);
        } else if (animDef.type === 'glb') {
          const gltfLoader = new GLTFLoader();
          const gltf = await new Promise<any>((resolve, reject) => {
            gltfLoader.load(
              animDef.path,
              (data) => resolve(data),
              undefined,
              (error) => reject(error)
            );
          });
          // Mixamo GLB thường chứa animation trong gltf.animations
          // Chúng ta cần remap nó tương tự như FBX
          clip = remapMixamoAnimationToVrm(vrm, {
            animations: gltf.animations,
            getObjectByName: (name: string) => gltf.scene.getObjectByName(name)
          } as any, animDef.bodyPart);

          if (!clip) {
            throw new Error(`Failed to load GLB animation ${animationId}: clip is null`);
          }
          clip.name = animationId;
          clip = trimAnimationClip(clip, animDef.startFrame, animDef.endFrame);
        } else if (animDef.type === 'vrma') {
          const gltfLoader = new GLTFLoader();
          // @ts-ignore
          gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
          // @ts-ignore
          gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

          const gltf = await new Promise<any>((resolve, reject) => {
            gltfLoader.load(
              animDef.path,
              (data) => resolve(data),
              undefined,
              (error) => reject(error)
            );
          });

          // Ưu tiên đọc VRMAnimation (VRMA) và bind vào humanoid của VRM
          const vrmAnimations = gltf?.userData?.vrmAnimations;
          if (vrmAnimations && vrmAnimations.length > 0) {
            const vrmAnimation = vrmAnimations[0];
            const boundClip = createVRMAnimationClip(vrmAnimation as any, vrm as any) as unknown as THREE.AnimationClip;
            boundClip.name = animationId;
            clip = trimAnimationClip(boundClip, animDef.startFrame, animDef.endFrame);
          } else if (gltf.animations && gltf.animations[0]) {
            // Fallback: một số file vẫn có gltf.animations
            const rawClip = gltf.animations[0].clone();
            rawClip.name = animationId;
            clip = trimAnimationClip(rawClip, animDef.startFrame, animDef.endFrame);
          } else {
            throw new Error(`Failed to load VRMA animation ${animationId}: no animation data`);
          }
        }

        // Đính metadata khung hình nếu có (totalFrames/start/end) để tính thời lượng hiệu dụng
        if (clip) {
          const userData = (clip as any).userData || {};
          if (animDef.totalFrames) {
            userData.totalFrames = animDef.totalFrames;
          }
          if (animDef.startFrame !== undefined) {
            userData.startFrame = animDef.startFrame;
          }
          if (animDef.endFrame !== undefined) {
            userData.endFrame = animDef.endFrame;
          }
          if (animDef.bodyPart) {
            userData.bodyPart = animDef.bodyPart;
          }
          if (animDef.seamless !== undefined) {
            userData.isSeamless = animDef.seamless;
            userData.seamless = animDef.seamless;
          }
          (clip as any).userData = userData;
        }

        cacheRef.current[animationId] = clip;
        updateLoadingState(animationId, 'loaded');
        return clip;
      } catch (error) {
        console.error(`Failed to load animation ${animationId}:`, error);
        updateLoadingState(animationId, 'error');
        return null;
      }
    },
    [vrm, loadingStates, updateLoadingState]
  );

  const getLoadedAnimation = useCallback((animationId: string): THREE.AnimationClip | null => {
    return cacheRef.current[animationId] || null;
  }, []);

  const isLoading = useCallback(
    (animationId: string): boolean => {
      return loadingStates[animationId] === 'loading';
    },
    [loadingStates]
  );

  const unloadAnimation = useCallback((animationId: string): void => {
    const clip = cacheRef.current[animationId];
    if (clip) {
      clip.tracks.length = 0;
      delete cacheRef.current[animationId];
      updateLoadingState(animationId, 'idle');
    }
  }, [updateLoadingState]);

  useEffect(() => {
    if (!vrm) return;

    const preloadList = getPreloadAnimations(registry);
    const loadPromises = preloadList.map((anim) =>
      loadAnimation(anim.id).then((clip) => ({
        id: anim.id,
        clip,
        success: clip !== null,
      }))
    );

    Promise.all(loadPromises)
      .then((results) => {
        const successfulLoads = results.filter((r) => r.success).map((r) => r.id);
        setPreloadedAnimations(successfulLoads);

        // Chấp nhận bất kỳ idle nào preload thành công làm critical (idleDown/idleUp)
        const anyIdleSuccess = results.some(
          (r) => registry[r.id]?.category === 'idle' && r.success
        );
        if (!anyIdleSuccess) {
          const errorMsg = '❌ CRITICAL: no idle animation preloaded successfully!';
          console.error(errorMsg);
          setPreloadError(errorMsg);
          setIsCriticalAnimationReady(false);
        } else {
          setIsCriticalAnimationReady(true);
        }

        const failedLoads = results.filter((r) => !r.success);
        if (failedLoads.length > 0) {
          console.warn('⚠️ Failed to preload animations:', failedLoads.map((r) => r.id));
        }
      })
      .catch((error) => {
        const errorMsg = `❌ CRITICAL: Preload failed - ${error.message}`;
        console.error(errorMsg, error);
        setPreloadError(errorMsg);
        setIsCriticalAnimationReady(false);
      });
  }, [vrm, loadAnimation]);

  return {
    loadAnimation,
    getLoadedAnimation,
    isLoading,
    preloadedAnimations,
    unloadAnimation,
    loadingStates,
    preloadError,
    isCriticalAnimationReady,
  };
};
