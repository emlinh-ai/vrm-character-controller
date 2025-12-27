import { useEffect, useRef } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { UseVrmLipsyncParams } from '../types';

const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'];

/**
 * Encapsulates VRM lipsync logic for maintainability.
 * Mirrors existing behavior: reset visemes, smooth 'ih' baseline and 'aa' volume-driven.
 */
export function useVrmLipsync({
  vrm,
  audioVolume = 0,
  isAudioPlaying = false,
  setCurrentExpression,
}: UseVrmLipsyncParams) {
  const time = useRef(0);
  const lastActiveTimeRef = useRef(0);

  useEffect(() => {
    if (!vrm?.expressionManager) return;
    const now = performance.now() / 1000;

    if (isAudioPlaying || audioVolume > 0.002) {
      lastActiveTimeRef.current = now;
    }

    const stillActive = now - lastActiveTimeRef.current < 0.2;
    const speaking = stillActive;

    if (speaking) {
      time.current += 0.2;

      VISEMES.forEach((exp) => {
        vrm.expressionManager!.setValue(exp, 0);
      });

      let volumeBasedAaValue = 0;
      if (audioVolume > 0.002) {
        const normalizedVolume = Math.min(audioVolume * 3.0, 1.0);
        const oscillation = (Math.sin(time.current) + 1) / 2;
        volumeBasedAaValue = Math.pow(normalizedVolume, 0.6) * oscillation * 2.5;
        volumeBasedAaValue = Math.min(volumeBasedAaValue, 1.0);
      }

      const currentIh = vrm.expressionManager.getValue('ih') || 0;
      const currentAa = vrm.expressionManager.getValue('aa') || 0;

      const baseIhValue = 0.7;
      const smoothingFactor = 0.4;
      const smoothedIh = currentIh * (1 - smoothingFactor) + baseIhValue * smoothingFactor;
      const smoothedAa = currentAa * (1 - smoothingFactor) + volumeBasedAaValue * smoothingFactor;

      vrm.expressionManager.setValue('ih', smoothedIh);
      vrm.expressionManager.setValue('aa', smoothedAa);

      if (setCurrentExpression) {
        setCurrentExpression(`ih:${smoothedIh.toFixed(2)} aa:${smoothedAa.toFixed(2)}`);
      }
    } else {
      time.current = 0;
      VISEMES.forEach((exp) => {
        const currentValue = vrm.expressionManager?.getValue(exp) || 0;
        if (currentValue > 0) {
          const newValue = currentValue * 0.85;
          vrm.expressionManager?.setValue(exp, newValue < 0.01 ? 0 : newValue);
        }
      });
    }
  }, [vrm, audioVolume, isAudioPlaying, setCurrentExpression]);
}
