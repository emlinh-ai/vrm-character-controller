import { useRef, useCallback } from 'react';
import { getRandomTalkingAnimation } from '../constants/animation-registry';

/**
 * Hook để select talking animation random từ pool
 * Tương tự như useIdleAnimationSelector nhưng cho talking animations
 */
export const useTalkingAnimationSelector = (registry: Record<string, any>) => {
  const currentTalkingRef = useRef<string | null>(null);
  const previousTalkingRef = useRef<string | null>(null);

  /**
   * Get next talking animation (random, excluding current và previous)
   */
  const getNextTalkingAnimation = useCallback((): string | null => {
    const randomTalking = getRandomTalkingAnimation(registry, currentTalkingRef.current || undefined);
    if (!randomTalking) return null;

    previousTalkingRef.current = currentTalkingRef.current;
    currentTalkingRef.current = randomTalking.id;

    return randomTalking.id;
  }, []);

  /**
   * Set current talking animation (để track khi manually set)
   */
  const setCurrentTalking = useCallback((animationId: string) => {
    previousTalkingRef.current = currentTalkingRef.current;
    currentTalkingRef.current = animationId;
  }, []);

  /**
   * Get initial random talking animation
   */
  const getInitialTalking = useCallback((): string | null => {
    const randomTalking = getRandomTalkingAnimation(registry);
    if (randomTalking) {
      currentTalkingRef.current = randomTalking.id;
      return randomTalking.id;
    }
    return null;
  }, []);

  /**
   * Cleanup
   */
  const cleanup = useCallback(() => {
    currentTalkingRef.current = null;
    previousTalkingRef.current = null;
  }, []);

  return {
    getNextTalkingAnimation,
    setCurrentTalking,
    getInitialTalking,
    cleanup,
    currentTalking: currentTalkingRef.current,
    previousTalking: previousTalkingRef.current,
  };
};
