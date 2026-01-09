import type { AnimationDefinition, AnimationCategory } from '../types';

/**
 * Register a new animation to the registry
 */
export const registerAnimation = (
  registry: Record<string, AnimationDefinition>,
  animation: AnimationDefinition
): void => {
  registry[animation.id] = animation;
};

/**
 * Get animation definition by ID
 */
export const getAnimationById = (
  registry: Record<string, AnimationDefinition>,
  id: string
): AnimationDefinition | undefined => {
  return registry[id];
};

/**
 * Get all animations that should be preloaded
 */
export const getPreloadAnimations = (
  registry: Record<string, AnimationDefinition>
): AnimationDefinition[] => {
  return Object.values(registry).filter((anim) => anim.preload);
};

/**
 * Get animations by category
 */
export const getAnimationsByCategory = (
  registry: Record<string, AnimationDefinition>,
  category: AnimationCategory
): AnimationDefinition[] => {
  return Object.values(registry).filter((anim) => anim.category === category);
};

/**
 * Get random idle animation
 * @param registry - Animation registry
 * @param excludeId - Optional animation ID to exclude (e.g., current playing animation)
 * @returns Random idle animation definition
 */
export const getRandomIdleAnimation = (
  registry: Record<string, AnimationDefinition>,
  excludeId?: string
): AnimationDefinition | null => {
  const idleAnimations = getAnimationsByCategory(registry, 'idle');

  if (idleAnimations.length === 0) {
    return null;
  }

  const availableAnimations = excludeId
    ? idleAnimations.filter((anim) => anim.id !== excludeId)
    : idleAnimations;

  if (availableAnimations.length === 0) {
    return idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
  }

  const randomIndex = Math.floor(Math.random() * availableAnimations.length);
  return availableAnimations[randomIndex];
};

/**
 * Get random talking animation
 * @param registry - Animation registry
 * @param excludeId - Optional animation ID to exclude (e.g., current playing animation)
 * @returns Random talking animation definition
 */
export const getRandomTalkingAnimation = (
  registry: Record<string, AnimationDefinition>,
  excludeId?: string
): AnimationDefinition | null => {
  const talkingAnimations = getAnimationsByCategory(registry, 'talking');

  if (talkingAnimations.length === 0) {
    return null;
  }

  const availableAnimations = excludeId
    ? talkingAnimations.filter((anim) => anim.id !== excludeId)
    : talkingAnimations;

  if (availableAnimations.length === 0) {
    return talkingAnimations[Math.floor(Math.random() * talkingAnimations.length)];
  }

  const randomIndex = Math.floor(Math.random() * availableAnimations.length);
  return availableAnimations[randomIndex];
};
