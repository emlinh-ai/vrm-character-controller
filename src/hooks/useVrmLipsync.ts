import { useEffect, useRef } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { UseVrmLipsyncParams } from '../types';

const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'];
const VISEME_ORDER = ['aa', 'ih', 'ou', 'ee', 'oh'];
const CROSSFADE_MS = 140;

/**
 * Encapsulates VRM lipsync logic for maintainability.
 * Mirrors existing behavior: reset visemes, smooth 'ih' baseline and 'aa' volume-driven.
 */
export function useVrmLipsync({
  vrm,
  audioVolume = 0,
  isAudioPlaying = false,
  setCurrentExpression,
  eyeClosure = 0,
  visemeId = null,
}: UseVrmLipsyncParams) {
  const time = useRef(0);
  const lastActiveTimeRef = useRef(0);
  const envelopeRef = useRef(0);
  const sustainEndRef = useRef(0);
  const visemeIndexRef = useRef(0);
  const lastSwitchRef = useRef(0);
  const activeVisemeRef = useRef<string>('aa');
  const transitionRef = useRef<{
    from: string;
    to: string;
    start: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!vrm?.expressionManager) return;
    const now = performance.now() / 1000;
    const nowMs = performance.now();

    if (isAudioPlaying || audioVolume > 0.002) {
      lastActiveTimeRef.current = now;
    }

    const stillActive = now - lastActiveTimeRef.current < 0.2;
    const speaking = stillActive;

    const beginTransition = (next: string) => {
      const currentTarget = transitionRef.current?.to ?? activeVisemeRef.current;
      if (next === currentTarget) return;
      transitionRef.current = {
        from: activeVisemeRef.current,
        to: next,
        start: nowMs,
        duration: CROSSFADE_MS,
      };
    };

    if (speaking) {
      time.current += 0.2;

      VISEMES.forEach((exp) => {
        vrm.expressionManager!.setValue(exp, 0);
      });

      // Envelope follower để tránh nhấp miệng khi âm ngân
      const attack = 0.45;
      const release = 0.06;
      const raw = Math.min(audioVolume * 2.2, 1.0);
      const delta = raw - envelopeRef.current;
      const coeff = delta > 0 ? attack : release;
      envelopeRef.current += delta * coeff;

      const openThreshold = 0.01;
      const holdSeconds = 0.55;
      if (envelopeRef.current > openThreshold) {
        sustainEndRef.current = nowMs + holdSeconds * 1000;
      }

      const isHeld = nowMs < sustainEndRef.current;
      const base = isHeld ? Math.max(envelopeRef.current, 0.1) : envelopeRef.current;

      const volumeBasedAaValue = Math.min(1, Math.pow(Math.max(0, base) * 1.8, 1.05));
      // Chọn viseme đích và khởi động crossfade nếu thay đổi
      if (visemeId) {
        beginTransition(visemeId);
      } else {
        const cycleMs = 320;
        if (volumeBasedAaValue > openThreshold && nowMs - lastSwitchRef.current > cycleMs) {
          visemeIndexRef.current = (visemeIndexRef.current + 1) % VISEME_ORDER.length;
          lastSwitchRef.current = nowMs;
        }
        beginTransition(VISEME_ORDER[visemeIndexRef.current]);
      }

      // Tính trọng số crossfade
      let from = activeVisemeRef.current;
      let to = activeVisemeRef.current;
      let fromWeight = 0;
      let toWeight = 1;

      if (transitionRef.current) {
        const progress = Math.min(
          1,
          (nowMs - transitionRef.current.start) / transitionRef.current.duration
        );
        from = transitionRef.current.from;
        to = transitionRef.current.to;
        fromWeight = 1 - progress;
        toWeight = progress;
        if (progress >= 1) {
          activeVisemeRef.current = transitionRef.current.to;
          transitionRef.current = null;
        }
      } else {
        activeVisemeRef.current = to;
      }

      const smoothingFactor = 0.35;
      const baseSecondary = visemeId ? 0 : volumeBasedAaValue * 0.25;
      const primaryLabel = to;

      VISEMES.forEach((exp) => {
        const currentVal = vrm.expressionManager.getValue(exp) || 0;
        const primaryContribution =
          (exp === from ? fromWeight : 0) + (exp === to ? toWeight : 0);
        const target =
          primaryContribution * volumeBasedAaValue + (1 - primaryContribution) * baseSecondary;
        const smoothed = currentVal * (1 - smoothingFactor) + target * smoothingFactor;
        vrm.expressionManager.setValue(exp, smoothed);
      });

      if (!visemeId && setCurrentExpression) {
        setCurrentExpression(
          `${primaryLabel}:${volumeBasedAaValue.toFixed(2)} env:${envelopeRef.current.toFixed(2)}`
        );
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

    // Áp dụng eyeClosure (0..1) để híp/nhắm mắt khi sustain dài
    const eyeValue = Math.min(1, Math.max(0, eyeClosure));
    vrm.expressionManager.setValue('blink', eyeValue);
    vrm.expressionManager.setValue('blinkLeft', eyeValue);
    vrm.expressionManager.setValue('blinkRight', eyeValue);
  }, [vrm, audioVolume, isAudioPlaying, setCurrentExpression, eyeClosure, visemeId]);
}
