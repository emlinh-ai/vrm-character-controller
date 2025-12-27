import { useEffect, useState } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { UseVrmExpressionParams, UseVrmExpressionReturn } from '../types';

/**
 * Custom hook to manage VRM expressions and emotions
 * Handles expression state and automatic switching based on emotion prop
 */
export const useVrmExpression = ({
  vrm,
  emotion,
}: UseVrmExpressionParams): UseVrmExpressionReturn => {
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');

  const allExpressions = {
    emotions: ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'],
    visemes: ['aa', 'ih', 'ou', 'ee', 'oh'],
    blinks: ['blink', 'blinkLeft', 'blinkRight'],
  };

  useEffect(() => {
    if (vrm?.expressionManager && emotion) {
      allExpressions.emotions.forEach((emotionName) => {
        vrm.expressionManager!.setValue(emotionName, 0);
      });

      if (allExpressions.emotions.includes(emotion)) {
        vrm.expressionManager!.setValue(emotion, 1);
        setCurrentExpression(emotion);
      } else {
        vrm.expressionManager!.setValue('neutral', 1);
        setCurrentExpression('neutral');
      }
    }
  }, [vrm, emotion]);

  return {
    currentExpression,
    setCurrentExpression,
    allExpressions,
  };
};
