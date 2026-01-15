import { useEffect, useRef, useState } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { UseVrmExpressionParams, UseVrmExpressionReturn } from '../types';

/**
 * Custom hook to manage VRM expressions and emotions
 * Handles expression state and automatic switching based on emotion prop
 */
export const useVrmExpression = ({
  vrm,
  emotion,
  emotionStrength = 1,
}: UseVrmExpressionParams): UseVrmExpressionReturn => {
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');
  const expressionValuesRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  const allExpressions = {
    emotions: ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'],
    visemes: ['aa', 'ih', 'ou', 'ee', 'oh'],
    blinks: ['blink', 'blinkLeft', 'blinkRight'],
  };

  useEffect(() => {
    if (!vrm?.expressionManager) return;

    const manager = vrm.expressionManager;

    const baseStrength = Math.max(0, Math.min(1, emotionStrength));
    const strengthMap: Record<string, number> = {
      neutral: 0,
      happy: baseStrength * 0.6,
      relaxed: baseStrength * 0.4,
      sad: baseStrength * 0.45,
      angry: baseStrength * 0.65,
      surprised: baseStrength * 0.55,
    };

    const targetEmotion = allExpressions.emotions.includes(emotion || '') ? (emotion as string) : 'neutral';
    const targetStrength = strengthMap[targetEmotion] ?? 0;

    const step = () => {
      let shouldContinue = false;

      allExpressions.emotions.forEach((emotionName) => {
        const prev = expressionValuesRef.current[emotionName] ?? 0;
        const target = emotionName === targetEmotion ? targetStrength : 0;
        const next = prev + (target - prev) * 0.08; // slower lerp for smoother transition
        expressionValuesRef.current[emotionName] = next;
        manager.setValue(emotionName, next);
        if (Math.abs(next - target) > 0.01) {
          shouldContinue = true;
        }
      });

      if (shouldContinue) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    step();
    setCurrentExpression(targetEmotion);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [vrm, emotion, emotionStrength]);

  return {
    currentExpression,
    setCurrentExpression,
    allExpressions,
  };
};
