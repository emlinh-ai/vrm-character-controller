/**
 * Animation Registry - Centralized animation definition
 * Defines all available animations and their metadata
 */

import type { AnimationDefinition, AnimationCategory } from '../types';

/**
 * Central registry of all available VRM animations
 * Add new animations here to make them available for lazy loading
 */
export const ANIMATION_REGISTRY: Record<string, AnimationDefinition> = {
  standingIdle: {
    id: 'standingIdle',
    name: 'Standing Idle',
    type: 'fbx',
    path: '/animations/fbx/Standing Idle.fbx',
    preload: true,
    category: 'idle',
  },
  greeting: {
    id: 'greeting',
    name: 'Greeting',
    type: 'vrma',
    path: 'animations/vrma/VRMA_02.vrma',
    preload: true,
    category: 'gesture',
    startFrame: 60,
  },
  peaceSign: {
    id: 'peaceSign',
    name: 'Peace sign',
    type: 'vrma',
    path: 'animations/vrma/VRMA_03.vrma',
    preload: true,
    category: 'gesture',
  },
  acknowledging: {
    id: 'acknowledging',
    name: 'Acknowledging',
    type: 'fbx',
    path: 'animations/fbx/Acknowledging.fbx',
    preload: true,
    category: 'gesture',
  },
  agreeing: {
    id: 'agreeing',
    name: 'Agreeing',
    type: 'fbx',
    path: 'animations/fbx/Agreeing.fbx',
    preload: true,
    category: 'gesture',
  },
  arm_gesture: {
    id: 'arm_gesture',
    name: 'Arm gesture',
    type: 'fbx',
    path: 'animations/fbx/Arm Gesture.fbx',
    preload: true,
    category: 'gesture',
  },
  dismissing_gesture: {
    id: 'dismissing_gesture',
    name: 'Dismissing gesture',
    type: 'fbx',
    path: 'animations/fbx/Dismissing Gesture.fbx',
    preload: true,
    category: 'gesture',
  },
  head_gesture: {
    id: 'head_gesture',
    name: 'Head gesture',
    type: 'fbx',
    path: 'animations/fbx/Head Gesture.fbx',
    preload: true,
    category: 'gesture',
  },
  thankful: {
    id: 'thankful',
    name: 'Thankful',
    type: 'fbx',
    path: 'animations/fbx/Thankful.fbx',
    preload: true,
    category: 'gesture',
  },
  thoughtful_head_nod: {
    id: 'thoughtful_head_nod',
    name: 'Thoughtful head nod',
    type: 'fbx',
    path: 'animations/fbx/Thoughtful Head Nod.fbx',
    preload: true,
    category: 'gesture',
  },
  whatever_gesture: {
    id: 'whatever_gesture',
    name: 'Whatever gesture',
    type: 'fbx',
    path: 'animations/fbx/Whatever Gesture.fbx',
    preload: true,
    category: 'gesture',
  },
  arm_crossed: {
    id: 'arm_crossed',
    name: 'Arm crossed',
    type: 'fbx',
    path: 'animations/fbx/Angry.fbx',
    preload: true,
    category: 'gesture',
    endFrame: 230,
  },
  idle_1: {
    id: 'idle_1',
    name: 'Idle 1',
    type: 'fbx',
    path: 'animations/fbx/idle-1.fbx',
    preload: true,
    category: 'idle',
  },
  normal_talking: {
    id: 'normal_talking',
    name: 'Normal talking',
    type: 'fbx',
    path: 'animations/fbx/Normal Talking.fbx',
    preload: true,
    category: 'talking',
  },
  sure_talking: {
    id: 'sure_talking',
    name: 'Sure talking',
    type: 'fbx',
    path: 'animations/fbx/Sure Talking.fbx',
    preload: true,
    category: 'talking',
  },
  talk_explaination: {
    id: 'talk_explaination',
    name: 'Talk explaination',
    type: 'fbx',
    path: 'animations/fbx/Talk Explaination.fbx',
    preload: true,
    category: 'gesture',
  },
  ask_understanding: {
    id: 'ask_understanding',
    name: 'Ask understanding',
    type: 'fbx',
    path: 'animations/fbx/Ask Understanding.fbx',
    preload: true,
    category: 'gesture',
  },
  confidence_talking: {
    id: 'confidence_talking',
    name: 'Confidence talking',
    type: 'fbx',
    path: 'animations/fbx/Confidence Talking.fbx',
    preload: true,
    category: 'gesture',
  },
  hand_gesture_talk_slow: {
    id: 'hand_gesture_talk_slow',
    name: 'Hand gesture talk slow',
    type: 'fbx',
    path: 'animations/fbx/Hand Gesture Talk Slow.fbx',
    preload: true,
    category: 'talking',
  },
  hand_gesture_talk_fast: {
    id: 'hand_gesture_talk_fast',
    name: 'Hand gesture talk fast',
    type: 'fbx',
    path: 'animations/fbx/Hand Gesture Talk Fast.fbx',
    preload: true,
    category: 'gesture',
  },
};

/**
 * Register a new animation to the registry
 */
export const registerAnimation = (animation: AnimationDefinition): void => {
  ANIMATION_REGISTRY[animation.id] = animation;
};

/**
 * Get animation definition by ID
 */
export const getAnimationById = (id: string): AnimationDefinition | undefined => {
  return ANIMATION_REGISTRY[id];
};

/**
 * Get all animations that should be preloaded
 */
export const getPreloadAnimations = (): AnimationDefinition[] => {
  return Object.values(ANIMATION_REGISTRY).filter((anim) => anim.preload);
};

/**
 * Get animations by category
 */
export const getAnimationsByCategory = (
  category: AnimationCategory
): AnimationDefinition[] => {
  return Object.values(ANIMATION_REGISTRY).filter((anim) => anim.category === category);
};

/**
 * Get random idle animation
 * @param excludeId - Optional animation ID to exclude (e.g., current playing animation)
 * @returns Random idle animation definition
 */
export const getRandomIdleAnimation = (excludeId?: string): AnimationDefinition | null => {
  const idleAnimations = getAnimationsByCategory('idle');

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
 * @param excludeId - Optional animation ID to exclude (e.g., current playing animation)
 * @returns Random talking animation definition
 */
export const getRandomTalkingAnimation = (excludeId?: string): AnimationDefinition | null => {
  const talkingAnimations = getAnimationsByCategory('talking');

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
