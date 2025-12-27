/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { UseVrmAnimationPlayerParams, UseVrmAnimationPlayerReturn } from '../types';

interface ActiveAction {
  action: THREE.AnimationAction;
  clip: THREE.AnimationClip;
}

const MIXAMO_INITIAL_FRAME_OFFSET_SECONDS: number = 1 / 30;

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
  onLoopAboutToRepeat,
  loopPreventionThreshold = 0.5,
}: UseVrmAnimationPlayerParams): UseVrmAnimationPlayerReturn => {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<ActiveAction | null>(null);
  const playingRef = useRef<boolean>(true);
  const hasCompletedRef = useRef<boolean>(false);
  const actionsCache = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const finishedListenerRef = useRef<((e: any) => void) | null>(null);
  const hasTriggeredLoopPreventionRef = useRef<boolean>(false);

  useEffect(() => {
    if (!vrm?.scene) return;

    const currentClip = activeActionRef.current?.clip;
    const wasPlaying = playingRef.current;
    const currentTime = activeActionRef.current?.action?.time || 0;

    mixerRef.current = new THREE.AnimationMixer(vrm.scene);
    actionsCache.current.clear();

    if (currentClip && wasPlaying) {
      const action = mixerRef.current.clipAction(currentClip);
      action.reset();
      action.time = currentTime;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      activeActionRef.current = { action, clip: currentClip };
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

  useEffect(() => {
    if (defaultClip && vrm && mixerRef.current && !activeActionRef.current) {
      const action = getOrCreateAction(defaultClip);
      if (action) {
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.play();
        activeActionRef.current = { action, clip: defaultClip };
      }
    }
  }, [defaultClip, vrm, loop, getOrCreateAction]);

  const playAnimation = (clip: THREE.AnimationClip | null, shouldLoop: boolean = true, customTransitionDuration?: number) => {
    if (!clip || !vrm || !mixerRef.current) return;

    const effectiveTransition = customTransitionDuration !== undefined ? customTransitionDuration : transitionDuration;
    const newAction = getOrCreateAction(clip);
    if (!newAction) return;

    const isSameClip = activeActionRef.current && activeActionRef.current.clip.name === clip.name;

    if (!isSameClip || !shouldLoop) {
      newAction.reset();
      if (clip.duration > MIXAMO_INITIAL_FRAME_OFFSET_SECONDS) {
        newAction.time = MIXAMO_INITIAL_FRAME_OFFSET_SECONDS;
      }
    }

    newAction.setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    newAction.clampWhenFinished = !shouldLoop;
    newAction.enabled = true;
    newAction.setEffectiveTimeScale(1);
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

    if (activeActionRef.current && !isSameClip) {
      const oldAction = activeActionRef.current.action;

      oldAction.setLoop(THREE.LoopOnce, 1);
      oldAction.clampWhenFinished = true;
      oldAction.fadeOut(effectiveTransition);

      newAction.play();
      newAction.fadeIn(effectiveTransition);

      setTimeout(() => {
        oldAction.stop();
      }, effectiveTransition * 1000 + 100);
    } else if (isSameClip) {
      newAction.play();
    } else {
      newAction.play();
      newAction.fadeIn(effectiveTransition);
    }

    activeActionRef.current = { action: newAction, clip };
    playingRef.current = true;
    hasCompletedRef.current = false;
    hasTriggeredLoopPreventionRef.current = false;
  };

  const pause = () => {
    playingRef.current = false;
    if (activeActionRef.current) {
      activeActionRef.current.action.paused = true;
    }
  };

  const resume = () => {
    playingRef.current = true;
    if (activeActionRef.current) {
      activeActionRef.current.action.paused = false;
    }
  };

  const stop = () => {
    playingRef.current = false;
    if (activeActionRef.current) {
      activeActionRef.current.action.stop();
    }
  };

  useFrame((_, delta) => {
    if (vrm) {
      vrm.update(delta);
    }

    if (mixerRef.current && playingRef.current) {
      mixerRef.current.update(delta);

      if (activeActionRef.current && !hasCompletedRef.current) {
        const action = activeActionRef.current.action;
        const clip = activeActionRef.current.clip;

        const effectiveWeight = action.getEffectiveWeight();
        if (
          action.loop === THREE.LoopOnce &&
          action.time >= clip.duration - 0.01 &&
          effectiveWeight > 0.5
        ) {
          hasCompletedRef.current = true;
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }
      }

      if (
        activeActionRef.current &&
        !hasTriggeredLoopPreventionRef.current &&
        onLoopAboutToRepeat
      ) {
        const action = activeActionRef.current.action;
        const clip = activeActionRef.current.clip;
        const effectiveWeight = action.getEffectiveWeight();

        if (action.loop === THREE.LoopRepeat && effectiveWeight > 0.9) {
          const timeUntilEnd = clip.duration - action.time;

          if (timeUntilEnd <= loopPreventionThreshold && timeUntilEnd > 0) {
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
    currentTime: activeActionRef.current?.action.time || 0,
  };
};
