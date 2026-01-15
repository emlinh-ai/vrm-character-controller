/* eslint-disable @typescript-eslint/no-explicit-any */
import { forwardRef, useImperativeHandle, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';
import { useVrmBlink } from '../hooks/useVrmBlink';
import { useVrmLookAt } from '../hooks/useVrmLookAt';
import { useVrmLipsync } from '../hooks/useVrmLipsync';
import { useVrmAnimationLoader } from '../hooks/useVrmAnimationLoader';
import { useVrmAnimationPlayer } from '../hooks/useVrmAnimationPlayer';
import { useVrmExpression } from '../hooks/useVrmExpression';
import { useIdleAnimationSelector } from '../hooks/useIdleAnimationSelector';
import { useGuitarAttachment } from '../hooks/useGuitarAttachment';
import { getAnimationById, getAnimationsByCategory } from '../constants/animation-registry';
import type { VRMModelProps, VRMModelRef } from '../types';

const VRMModel = forwardRef<VRMModelRef, VRMModelProps>(
  (
    {
      vrmUrl,
      basePath = 'models',
      audioVolume = 0,
      isAudioPlaying = false,
      positions = [0, 0, 0],
      emotion = 'neutral',
      eyeClosure = 0,
      visemeId = null,
      onLoadComplete,
      onAnimationEnd,
      onLoopAboutToRepeat,
      onReadyToTalk,
      kiss = 0,
      lipsClosed = 0,
      jaw = 0,
      animationRegistry = {},
      transitionDuration = 0.5,
      idleTransitionDuration = 1.0,
      animationSpeed = 1.0,
      activeAnimationId = null,
    },
    ref
  ) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isModelReady, setIsModelReady] = useState(false);
    const [hasPlayedGreeting, setHasPlayedGreeting] = useState(false);
    const [hasTransitionedToIdle, setHasTransitionedToIdle] = useState(false);
    const [currentAnimationCategory, setCurrentAnimationCategory] = useState<
      'idle' | 'talking' | 'gesture' | 'emotion' | null
    >(null);

    const { scene, userData } = useGLTF(
      `${basePath}/${vrmUrl}`,
      'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
      undefined,
      (loader: any) => {
        loader.register((parser: any) => new VRMLoaderPlugin(parser));
        loader.register((parser: any) => new VRMAnimationLoaderPlugin(parser));
      }
    );
    const vrm = userData.vrm;

    const {
      loadAnimation,
      getLoadedAnimation,
      preloadedAnimations,
      preloadError,
      isCriticalAnimationReady,
    } = useVrmAnimationLoader(vrm, animationRegistry);

    const { getNextIdleAnimation, setCurrentIdle, getInitialIdle } = useIdleAnimationSelector(animationRegistry);
    const lastUpperIdleRef = useRef<string | null>(null);
    const lastLowerIdleRef = useRef<string | null>(null);

    const { guitarRef } = useGuitarAttachment({ vrm });

    const defaultClip = useMemo(() => {
      return getLoadedAnimation('idle') || null;
    }, [getLoadedAnimation, preloadedAnimations]);

    const pickIdleByBodyPart = useCallback(
      (part: 'upper' | 'lower', preferredId?: string | null) => {
        if (preferredId) {
          const preferredAnim = getAnimationsByCategory(animationRegistry, 'idle').find(
            (anim) => anim.bodyPart === part && anim.id === preferredId
          );
          if (preferredAnim) {
            if (part === 'upper') {
              lastUpperIdleRef.current = preferredAnim.id;
            } else {
              lastLowerIdleRef.current = preferredAnim.id;
            }
            return preferredAnim.id;
          }
        }

        const idles = getAnimationsByCategory(animationRegistry, 'idle').filter((anim) => anim.bodyPart === part);
        if (idles.length === 0) return null;

        const lastId = part === 'upper' ? lastUpperIdleRef.current : lastLowerIdleRef.current;
        const candidates = lastId ? idles.filter((anim) => anim.id !== lastId) : idles;
        const pool = candidates.length > 0 ? candidates : idles;
        const selected = pool[Math.floor(Math.random() * pool.length)];

        if (part === 'upper') {
          lastUpperIdleRef.current = selected.id;
        } else {
          lastLowerIdleRef.current = selected.id;
        }

        return selected.id;
      },
      [animationRegistry]
    );

    const loadIdlePair = useCallback(
      async (preferredLowerId?: string | null, preferredUpperId?: string | null) => {
        // Ưu tiên preferred, nếu fail sẽ chọn ngẫu nhiên theo body part
        const lowerId = pickIdleByBodyPart('lower', preferredLowerId);
        const upperId = pickIdleByBodyPart('upper', preferredUpperId);

        let lowerUsedId: string | null = null;
        let upperUsedId: string | null = null;

        let [lowerClip, upperClip] = await Promise.all([
          lowerId ? loadAnimation(lowerId) : Promise.resolve(null),
          upperId ? loadAnimation(upperId) : Promise.resolve(null),
        ]);

        if (lowerClip) lowerUsedId = lowerId;
        if (upperClip) upperUsedId = upperId;

        // Nếu preferred load fail, thử chọn lại clip khác trong cùng body part
        if (!lowerClip) {
          const fallbackLowerId = pickIdleByBodyPart('lower', null);
          if (fallbackLowerId && fallbackLowerId !== lowerId) {
            lowerClip = await loadAnimation(fallbackLowerId);
            if (lowerClip) lowerUsedId = fallbackLowerId;
          }
        }
        if (!upperClip) {
          const fallbackUpperId = pickIdleByBodyPart('upper', null);
          if (fallbackUpperId && fallbackUpperId !== upperId) {
            upperClip = await loadAnimation(fallbackUpperId);
            if (upperClip) upperUsedId = fallbackUpperId;
          }
        }

        if (lowerClip) lastLowerIdleRef.current = lowerUsedId;
        if (upperClip) lastUpperIdleRef.current = upperUsedId;

        return { lowerClip, upperClip, lowerUsedId, upperUsedId };
      },
      [pickIdleByBodyPart, loadAnimation]
    );

    const handleAnimationComplete = () => {
      if (!hasTransitionedToIdle) {
        setHasPlayedGreeting(true);
        setHasTransitionedToIdle(true);

        const initialIdleId = getInitialIdle() || pickIdleByBodyPart('lower') || pickIdleByBodyPart('upper') || 'idle';

        loadIdlePair()
          .then(({ lowerClip, upperClip }) => {
            if (lowerClip) playAnimation(lowerClip, true, idleTransitionDuration, 'lower');
            if (upperClip) playAnimation(upperClip, true, idleTransitionDuration, 'upper');
            if (lowerClip || upperClip) {
              setCurrentIdle('idlePair');
              setCurrentAnimationCategory('idle');
              return;
            }

            return loadAnimation(initialIdleId).then((idleClip) => {
              if (idleClip) {
                playAnimation(idleClip, true, idleTransitionDuration);
                setCurrentIdle(initialIdleId);
                setCurrentAnimationCategory('idle');
              }
            });
          })
          .catch(console.error);
      } else {
        const nextIdleId =
          getNextIdleAnimation() || getInitialIdle() || pickIdleByBodyPart('lower') || pickIdleByBodyPart('upper') || 'idle';
        loadIdlePair()
          .then(({ lowerClip, upperClip }) => {
            if (lowerClip) playAnimation(lowerClip, true, idleTransitionDuration, 'lower');
            if (upperClip) playAnimation(upperClip, true, idleTransitionDuration, 'upper');
            if (lowerClip || upperClip) {
              setCurrentIdle('idlePair');
              setCurrentAnimationCategory('idle');
              return;
            }

            return loadAnimation(nextIdleId).then((idleClip) => {
              if (idleClip) {
                playAnimation(idleClip, true, idleTransitionDuration);
                setCurrentIdle(nextIdleId);
                setCurrentAnimationCategory('idle');
              }
            });
          })
          .catch(console.error);
      }

      if (onAnimationEnd) {
        onAnimationEnd();
      }
    };

    const { playAnimation } = useVrmAnimationPlayer({
      vrm,
      defaultClip,
      onAnimationComplete: handleAnimationComplete,
      transitionDuration,
      animationSpeed,
      onLoopAboutToRepeat: () => handleLoopAboutToRepeat(),
      loopPreventionThreshold: 2.0,
    });

    const handleLoopAboutToRepeat = useCallback(async () => {
      if (currentAnimationCategory === 'idle') {
        const { lowerClip, upperClip } = await loadIdlePair();
        if (lowerClip) playAnimation(lowerClip, true, idleTransitionDuration, 'lower');
        if (upperClip) playAnimation(upperClip, true, idleTransitionDuration, 'upper');
        if (lowerClip || upperClip) {
          setCurrentIdle('idlePair');
          if (onLoopAboutToRepeat) onLoopAboutToRepeat();
          return;
        }

        const nextIdleId = getNextIdleAnimation();
        if (nextIdleId) {
          const nextIdleClip = await loadAnimation(nextIdleId);
          if (nextIdleClip) {
            playAnimation(nextIdleClip, true, idleTransitionDuration);
            setCurrentIdle(nextIdleId);
          }
        }
      }

      if (onLoopAboutToRepeat) {
        onLoopAboutToRepeat();
      }
    }, [currentAnimationCategory, getNextIdleAnimation, loadAnimation, playAnimation, setCurrentIdle, onLoopAboutToRepeat, idleTransitionDuration, loadIdlePair]);

    const { currentExpression, setCurrentExpression } = useVrmExpression({
      vrm,
      emotion,
    });

    // Toggle visibility when playGuitar idle được kích hoạt
    useEffect(() => {
      if (guitarRef.current) {
        guitarRef.current.visible = activeAnimationId === 'playGuitar';
      }
    }, [activeAnimationId]);

    useEffect(() => {
      if (vrm && preloadedAnimations.length > 0 && !isModelReady) {
        setIsModelReady(true);
        if (onLoadComplete) {
          onLoadComplete();
        }
      }
    }, [vrm, preloadedAnimations.length, isModelReady, onLoadComplete]);

    useEffect(() => {
      if (!isModelReady || hasPlayedGreeting) return;

      const greetingClip = getLoadedAnimation('greeting');
      if (greetingClip) {
        playAnimation(greetingClip, false);
      } else {
        setHasPlayedGreeting(true);
        setHasTransitionedToIdle(true);
      }
    }, [isModelReady, hasPlayedGreeting]);

    const startTalkingAnimation = () => {
      setIsAnimating(true);
    };

    const stopTalkingAnimation = () => {
      setIsAnimating(false);
      setCurrentExpression('neutral');
    };

    const playAnimationById = async (
      animationId: string,
      shouldLoop?: boolean,
      transitionDuration?: number
    ) => {
      const animDef = getAnimationById(animationRegistry, animationId);

      let clip: any = null;

      // Nếu là idle và bodyPart là full, load trực tiếp animation đó
      if (animDef?.category === 'idle' && animDef?.bodyPart === 'full') {
        clip = await loadAnimation(animationId);
      }
      // Nếu là idle và có đủ upper/lower, play hai kênh thay vì merge clip
      else if (animDef?.category === 'idle') {
        const preferredLower = animDef.bodyPart === 'lower' ? animationId : undefined;
        const preferredUpper = animDef.bodyPart === 'upper' ? animationId : undefined;
        const { lowerClip, upperClip } = await loadIdlePair(preferredLower, preferredUpper);

        const loop = shouldLoop !== undefined ? shouldLoop : true;
        if (lowerClip) playAnimation(lowerClip, loop, transitionDuration, 'lower');
        if (upperClip) playAnimation(upperClip, loop, transitionDuration, 'upper');

        if (lowerClip || upperClip) {
          setCurrentAnimationCategory('idle');
          setCurrentIdle('idlePair');
          return;
        }
      }

      if (!clip) {
        clip = await loadAnimation(animationId);
      }

      if (!clip && animationId !== 'idle') {
        console.warn(`⚠️ Animation "${animationId}" failed to load, falling back to idle`);
        clip = await loadAnimation('idle');
      }

      if (clip) {
        const isIdleAnimation = animDef?.category === 'idle';
        const loop = shouldLoop !== undefined ? shouldLoop : isIdleAnimation;
        const bodyOverride = animDef?.bodyPart as any;

        playAnimation(clip, loop, transitionDuration, bodyOverride);

        if (animDef?.category) {
          setCurrentAnimationCategory(animDef.category);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      startTalking: startTalkingAnimation,
      stopTalking: stopTalkingAnimation,
      isAnimating,
      currentExpression,
      playAnimationById,
      getLoadedAnimation,
      isModelReady,
      preloadError,
      isCriticalAnimationReady,
    }));

    useEffect(() => {
      if (!vrm?.expressionManager) return;

      vrm.expressionManager.setValue('ou', kiss ?? 0);
      vrm.expressionManager.setValue('ih', lipsClosed ?? 0);
      vrm.expressionManager.setValue('aa', jaw ?? 0);
    }, [vrm, kiss, lipsClosed, jaw]);

    useVrmBlink(vrm);

    useVrmLipsync({
      vrm,
      audioVolume,
      isAudioPlaying,
      setCurrentExpression,
      eyeClosure,
      visemeId,
    });

    useVrmLookAt(vrm, {
      enabled: true,
      smoothness: 0.1,
    });

    return (
      <group position={positions}>
        <primitive object={scene} />
      </group>
    );
  }
);

VRMModel.displayName = 'VRMModel';

export default VRMModel;
