import { useEffect, useRef } from 'react';
import type { VRM } from '@pixiv/three-vrm';

const getRandomNumber = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

/**
 * A hook to make the VRM model blink at random intervals.
 * @param vrm The VRM model instance.
 */
export const useVrmBlink = (vrm: VRM | null) => {
  const blinkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!vrm?.expressionManager) {
      return;
    }

    const scheduleNextBlink = () => {
      if (blinkTimeout.current) {
        clearTimeout(blinkTimeout.current);
      }

      const nextBlinkDelay = getRandomNumber(2000, 5000);

      blinkTimeout.current = setTimeout(() => {
        const blinkValue = getRandomNumber(0.5, 1.0);
        vrm.expressionManager?.setValue('blink', blinkValue);

        setTimeout(() => {
          if (vrm?.expressionManager) {
            vrm.expressionManager.setValue('blink', 0);
          }
        }, 150);

        scheduleNextBlink();
      }, nextBlinkDelay);
    };

    scheduleNextBlink();

    return () => {
      if (blinkTimeout.current) {
        clearTimeout(blinkTimeout.current);
      }
    };
  }, [vrm]);
};
