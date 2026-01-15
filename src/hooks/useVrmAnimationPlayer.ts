/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { UseVrmAnimationPlayerParams, UseVrmAnimationPlayerReturn } from '../types';

type Channel = 'full' | 'upper' | 'lower';

interface ActiveAction {
  action: THREE.AnimationAction;
  clip: THREE.AnimationClip;
}

interface SeamlessLoopState {
  clip: THREE.AnimationClip;
  actions: [THREE.AnimationAction, THREE.AnimationAction];
  activeIndex: 0 | 1;
  fadeDuration: number;
  isFading: boolean;
}

const MIXAMO_INITIAL_FRAME_OFFSET_SECONDS: number = 1 / 30;
const LOWER_BODY_MAX_WEIGHT = 0.3;

/**
 * Custom hook to handle VRM animation playback using AnimationMixer
 * Uses crossFadeTo for smooth transitions between animations
 */
export const useVrmAnimationPlayer = ({
  vrm,
  defaultClip,
  loop = true,
  onAnimationComplete,
  transitionDuration = 0.3,
  animationSpeed = 1.0,
  onLoopAboutToRepeat,
  loopPreventionThreshold = 0.5,
}: UseVrmAnimationPlayerParams): UseVrmAnimationPlayerReturn => {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionsRef = useRef<Record<Channel, ActiveAction | null>>({
    full: null,
    upper: null,
    lower: null,
  });
  const playingRef = useRef<boolean>(true);
  const hasCompletedRef = useRef<boolean>(false);
  const actionsCache = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const finishedListenerRef = useRef<((e: any) => void) | null>(null);
  const hasTriggeredLoopPreventionRef = useRef<boolean>(false);
  const seamlessLoopsRef = useRef<Record<Channel, SeamlessLoopState | null>>({
    full: null,
    upper: null,
    lower: null,
  });

  useEffect(() => {
    if (!vrm?.scene) return;

    const currentClip = activeActionsRef.current.full?.clip;
    const wasPlaying = playingRef.current;
    const currentTime = activeActionsRef.current.full?.action?.time || 0;

    mixerRef.current = new THREE.AnimationMixer(vrm.scene as any);
    actionsCache.current.clear();
    seamlessLoopsRef.current.full = null;
    seamlessLoopsRef.current.upper = null;
    seamlessLoopsRef.current.lower = null;

    if (currentClip && wasPlaying) {
      const action = mixerRef.current.clipAction(currentClip);
      action.reset();
      action.time = currentTime;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      activeActionsRef.current.full = { action, clip: currentClip };
      actionsCache.current.set(currentClip.name, action);
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        actionsCache.current.clear();
      }
    };
  }, [vrm]);

  const getOrCreateAction = useCallback((clip: THREE.AnimationClip): THREE.AnimationAction | null => {
    if (!mixerRef.current) return null;

    const cached = actionsCache.current.get(clip.name);
    if (cached) return cached;

    const action = mixerRef.current.clipAction(clip);
    actionsCache.current.set(clip.name, action);
    return action;
  }, []);

  const isClipSeamless = useCallback((clip: THREE.AnimationClip): boolean => {
    return Boolean((clip as any)?.userData?.isSeamless);
  }, []);

  const stopSeamlessLoop = useCallback(
    (channel: Channel) => {
      const state = seamlessLoopsRef.current[channel];
      if (!state) return;
      state.actions.forEach((action) => {
        action.stop();
        action.enabled = false;
      });
      seamlessLoopsRef.current[channel] = null;
    },
    []
  );

  const setupSeamlessLoop = useCallback(
    (
      channel: Channel,
      clip: THREE.AnimationClip,
      fadeDuration: number,
      shouldReset: boolean
    ) => {
      if (!mixerRef.current) return;

      const existing = seamlessLoopsRef.current[channel];
      if (existing && existing.clip.name === clip.name) {
        if (shouldReset) {
          existing.actions.forEach((action) => {
            action.reset();
            action.enabled = true;
            action.setEffectiveTimeScale(animationSpeed);
            action.setEffectiveWeight(1);
          });
          existing.actions[existing.activeIndex].play();
        }
        activeActionsRef.current[channel] = {
          action: existing.actions[existing.activeIndex],
          clip,
        };
        return;
      }

      stopSeamlessLoop(channel);

      const clipA = clip.clone();
      clipA.name = `${clip.name}__seamless__A`;
      const clipB = clip.clone();
      clipB.name = `${clip.name}__seamless__B`;

      const actionA = mixerRef.current.clipAction(clipA);
      const actionB = mixerRef.current.clipAction(clipB);

      [actionA, actionB].forEach((action) => {
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.enabled = true;
        action.setEffectiveTimeScale(animationSpeed);
        action.setEffectiveWeight(1);
      });

      actionA.play();

      actionsCache.current.set(clipA.name, actionA);
      actionsCache.current.set(clipB.name, actionB);

      seamlessLoopsRef.current[channel] = {
        clip,
        actions: [actionA, actionB],
        activeIndex: 0,
        fadeDuration,
        isFading: false,
      };

      activeActionsRef.current[channel] = { action: actionA, clip };
    },
    [animationSpeed, stopSeamlessLoop]
  );

  const getEffectiveDuration = useCallback((clip: THREE.AnimationClip): number => {
    const meta = (clip as any).userData || {};
    const fps = 30; // giả định mixamo 30fps
    if (meta.totalFrames) {
      return meta.totalFrames / fps;
    }
    if (meta.startFrame !== undefined && meta.endFrame !== undefined && meta.endFrame > meta.startFrame) {
      return (meta.endFrame - meta.startFrame) / fps;
    }
    return clip.duration;
  }, []);

  useEffect(() => {
    if (defaultClip && vrm && mixerRef.current && !activeActionsRef.current.full) {
      const action = getOrCreateAction(defaultClip);
      if (action) {
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.setEffectiveTimeScale(animationSpeed);
        action.play();
        activeActionsRef.current.full = { action, clip: defaultClip };
      }
    }
  }, [defaultClip, vrm, loop, getOrCreateAction, animationSpeed]);

  // Update animation speed for currently playing action
  useEffect(() => {
    Object.values(activeActionsRef.current).forEach((act) => {
      if (act) act.action.setEffectiveTimeScale(animationSpeed);
    });
    Object.values(seamlessLoopsRef.current).forEach((state) => {
      if (!state) return;
      state.actions.forEach((action) => {
        action.setEffectiveTimeScale(animationSpeed);
      });
    });
  }, [animationSpeed]);

  const resolveChannel = (clip: THREE.AnimationClip, override?: Channel | 'full'): Channel => {
    const meta = (clip as any).userData || {};
    if (override === 'upper' || override === 'lower') return override;
    if (meta.bodyPart === 'upper') return 'upper';
    if (meta.bodyPart === 'lower') return 'lower';
    return 'full';
  };

  const fadeOutOtherChannels = (channel: Channel) => {
    Object.entries(activeActionsRef.current).forEach(([key, act]) => {
      if (key !== channel && act) {
        act.action.stop();
        act.action.enabled = false;
        activeActionsRef.current[key as Channel] = null;
      }
    });
  };

  const playAnimation = useCallback(
    (clip: THREE.AnimationClip | null, shouldLoop: boolean = true, customTransitionDuration?: number, bodyPartOverride?: Channel | 'full') => {
      if (!clip || !vrm || !mixerRef.current) return;

      const channel = resolveChannel(clip, bodyPartOverride);
      const newAction = getOrCreateAction(clip);
      if (!newAction) return;

      const shouldUseSeamlessLoop = shouldLoop && isClipSeamless(clip);
      const effectiveFadeDuration = Math.max(0.05, customTransitionDuration ?? transitionDuration);

      const activeChannelAction = activeActionsRef.current[channel];
      const isSameClip = activeChannelAction && activeChannelAction.clip.name === clip.name;
      const canSyncLoopTime = shouldLoop && activeChannelAction != null;
      let synced = false;

      if (!isSameClip || !shouldLoop) {
        newAction.reset();
      }

      if (canSyncLoopTime) {
        const oldAction = activeChannelAction!.action;
        const oldClip = activeChannelAction!.clip;
        const oldDuration = getEffectiveDuration(oldClip);
        const newDuration = getEffectiveDuration(clip);
        if (oldDuration > 0 && newDuration > 0) {
          const normalized = (oldAction.time % oldDuration) / oldDuration;
          newAction.time = normalized * newDuration;
          synced = true;
        }
      }

      // Các clip đã thống nhất pose frame đầu, không cần dịch offset để tránh sốc mesh
      if (!synced) {
        newAction.time = 0;
      }

      if (shouldUseSeamlessLoop) {
        // Nếu channel full, dừng các channel khác ngay lập tức
        if (channel === 'full') {
          fadeOutOtherChannels('full');
        }

        if (activeChannelAction && !isSameClip) {
          activeChannelAction.action.stop();
        }

        setupSeamlessLoop(channel, clip, effectiveFadeDuration, true);
        playingRef.current = true;
        hasCompletedRef.current = false;
        hasTriggeredLoopPreventionRef.current = false;
        return;
      }

      stopSeamlessLoop(channel);

      newAction.setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      newAction.clampWhenFinished = !shouldLoop;
      newAction.enabled = true;
      newAction.setEffectiveTimeScale(animationSpeed);
      newAction.setEffectiveWeight(1);

      if (finishedListenerRef.current && mixerRef.current) {
        mixerRef.current.removeEventListener('finished', finishedListenerRef.current);
        finishedListenerRef.current = null;
      }

      if (!shouldLoop && mixerRef.current) {
        const onFinished = (event: any) => {
          if (event.action === newAction && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          }
        };
        finishedListenerRef.current = onFinished;
        mixerRef.current.addEventListener('finished', onFinished);
      }

      // Nếu channel full, dừng các channel khác ngay lập tức
      if (channel === 'full') {
        fadeOutOtherChannels('full');
      }

      if (activeChannelAction && !isSameClip) {
        const oldAction = activeChannelAction.action;
        oldAction.stop();

        // Reset spring bones để tránh giật mesh khi đổi clip
        if (vrm.springBoneManager) {
          vrm.springBoneManager.reset();
        }

        newAction.enabled = true;
        newAction.setEffectiveTimeScale(animationSpeed);
        newAction.setEffectiveWeight(1);
        newAction.play();
      } else {
        newAction.enabled = true;
        newAction.setEffectiveTimeScale(animationSpeed);
        newAction.setEffectiveWeight(1);
        newAction.play();
        if (vrm.springBoneManager) {
          vrm.springBoneManager.reset();
        }
      }

      activeActionsRef.current[channel] = { action: newAction, clip };
      playingRef.current = true;
      hasCompletedRef.current = false;
      hasTriggeredLoopPreventionRef.current = false;
    },
    [
      vrm,
      transitionDuration,
      animationSpeed,
      getOrCreateAction,
      onAnimationComplete,
      isClipSeamless,
      setupSeamlessLoop,
      stopSeamlessLoop,
    ]
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    Object.values(activeActionsRef.current).forEach((act) => {
      if (act) act.action.paused = true;
    });
    Object.values(seamlessLoopsRef.current).forEach((state) => {
      if (!state) return;
      state.actions.forEach((action) => {
        action.paused = true;
      });
    });
  }, []);

  const resume = useCallback(() => {
    playingRef.current = true;
    Object.values(activeActionsRef.current).forEach((act) => {
      if (act) act.action.paused = false;
    });
    Object.values(seamlessLoopsRef.current).forEach((state) => {
      if (!state) return;
      state.actions.forEach((action) => {
        action.paused = false;
      });
    });
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    Object.values(activeActionsRef.current).forEach((act) => {
      if (act) act.action.stop();
    });
    Object.values(seamlessLoopsRef.current).forEach((state) => {
      if (!state) return;
      state.actions.forEach((action) => {
        action.stop();
      });
    });
  }, []);

  useFrame((_, delta) => {
    if (mixerRef.current && playingRef.current) {
      mixerRef.current.update(delta);
    }

    if (vrm) {
      vrm.update(delta);
    }

    // Giới hạn weight cho mọi action lower body (bao gồm action cũ đang fade out) để tránh rung mạnh khi driven bởi nhạc.
    // Không clamp các clip mixed (upper+lower) để tránh ảnh hưởng upper.
    actionsCache.current.forEach((action) => {
      const clip = action.getClip();
      const bodyPart = (clip as any)?.userData?.bodyPart;
      if (bodyPart === 'lower' && action.getEffectiveWeight() > LOWER_BODY_MAX_WEIGHT) {
        action.setEffectiveWeight(LOWER_BODY_MAX_WEIGHT);
      }
    });

    if (playingRef.current) {
      (['full', 'upper', 'lower'] as Channel[]).forEach((channel) => {
        const state = seamlessLoopsRef.current[channel];
        if (!state) return;

        const activeAction = state.actions[state.activeIndex];
        const duration = getEffectiveDuration(state.clip);
        if (duration <= 0) return;

        const fadeDuration = Math.min(state.fadeDuration, Math.max(0.05, duration * 0.5));
        const timeUntilEnd = duration - activeAction.time;

        if (!state.isFading && timeUntilEnd <= fadeDuration && timeUntilEnd > 0) {
          const nextIndex: 0 | 1 = state.activeIndex === 0 ? 1 : 0;
          const nextAction = state.actions[nextIndex];

          nextAction.reset();
          nextAction.enabled = true;
          nextAction.setEffectiveTimeScale(animationSpeed);
          nextAction.setEffectiveWeight(1);
          nextAction.play();

          activeAction.crossFadeTo(nextAction, fadeDuration, true);

          state.activeIndex = nextIndex;
          state.isFading = true;
          activeActionsRef.current[channel] = { action: nextAction, clip: state.clip };
        }

        if (state.isFading && activeAction.time >= fadeDuration) {
          state.isFading = false;
        }
      });
    }

    // Logic xử lý loop repeat prevention và notification
    if (mixerRef.current && playingRef.current && !hasTriggeredLoopPreventionRef.current && onLoopAboutToRepeat) {
      const primary =
        activeActionsRef.current.full || activeActionsRef.current.upper || activeActionsRef.current.lower;
      if (primary) {
        const action = primary.action;
        const clip = primary.clip;
        const effectiveWeight = action.getEffectiveWeight();

        const isLooping = action.loop === THREE.LoopRepeat || isClipSeamless(clip);

        if (isLooping && effectiveWeight > 0.9) {
          const duration = getEffectiveDuration(clip);
          const timeUntilEnd = duration - Math.min(action.time, duration);
          // Giảm khả năng chuyển sớm: lấy min(ngưỡng cấu hình, 5% thời lượng), có sàn 0.05s
          const dynamicThreshold = Math.min(loopPreventionThreshold, Math.max(0.05, duration * 0.05));

          if (timeUntilEnd <= dynamicThreshold && timeUntilEnd > 0) {
            hasTriggeredLoopPreventionRef.current = true;
            onLoopAboutToRepeat();
          }
        }
      }
    }
  });

  return {
    playAnimation,
    pause,
    resume,
    stop,
    isPlaying: playingRef.current,
    currentTime:
      activeActionsRef.current.full?.action.time ||
      activeActionsRef.current.upper?.action.time ||
      activeActionsRef.current.lower?.action.time ||
      0,
  };
};
