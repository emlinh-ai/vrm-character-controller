import { useRef, useCallback } from 'react';
import { getRandomIdleAnimation } from '../constants/animation-registry';

/**
 * Hook đơn giản để select idle animation khác với animation hiện tại/trước đó
 * Không có timer - chỉ là pure helper cho logic chọn animation
 */
export const useIdleAnimationSelector = () => {
  const currentIdleRef = useRef<string | null>(null);
  const previousIdleRef = useRef<string | null>(null);

  /**
   * Get next idle animation (random, excluding current và previous)
   */
  const getNextIdleAnimation = useCallback((): string | null => {
    const randomIdle = getRandomIdleAnimation(currentIdleRef.current || undefined);
    if (!randomIdle) return null;

    previousIdleRef.current = currentIdleRef.current;
    currentIdleRef.current = randomIdle.id;

    return randomIdle.id;
  }, []);

  /**
   * Set current idle animation (để track khi manually set)
   */
  const setCurrentIdle = useCallback((animationId: string) => {
    previousIdleRef.current = currentIdleRef.current;
    currentIdleRef.current = animationId;
  }, []);

  /**
   * Get initial random idle animation
   */
  const getInitialIdle = useCallback((): string | null => {
    const randomIdle = getRandomIdleAnimation();
    if (randomIdle) {
      currentIdleRef.current = randomIdle.id;
      return randomIdle.id;
    }
    return null;
  }, []);

  /**
   * Cleanup
   */
  const cleanup = useCallback(() => {
    currentIdleRef.current = null;
    previousIdleRef.current = null;
  }, []);

  return {
    getNextIdleAnimation,
    setCurrentIdle,
    getInitialIdle,
    cleanup,
    currentIdle: currentIdleRef.current,
    previousIdle: previousIdleRef.current,
  };
};
