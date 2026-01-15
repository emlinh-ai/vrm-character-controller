import type { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

// Animation Types
export type AnimationType = 'fbx' | 'vrma' | 'glb';
export type AnimationCategory = 'idle' | 'gesture' | 'emotion' | 'talking';
export type AnimationBodyPart = 'upper' | 'lower' | 'full';

export interface AnimationDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: AnimationType;
  readonly path: string;
  readonly preload?: boolean;
  readonly category?: AnimationCategory;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly totalFrames?: number;
  readonly bodyPart?: AnimationBodyPart;
}

// VRM Model Props
export interface VRMModelProps {
  vrmUrl: string;
  basePath?: string;
  audioVolume?: number;
  audioCurrentTime?: number;
  audioDuration?: number;
  isAudioPlaying?: boolean;
  eyeClosure?: number;
  positions?: [number, number, number];
  emotion?: string | null;
  onLoadComplete?: () => void;
  onAnimationEnd?: () => void;
  onLoopAboutToRepeat?: () => void;
  onReadyToTalk?: () => void;
  kiss?: number;
  lipsClosed?: number;
  jaw?: number;
  animationRegistry?: Record<string, any>;
}

export interface VRMModelRef {
  startTalking: () => void;
  stopTalking: () => void;
  isAnimating: boolean;
  playAnimationById: (animationId: string, shouldLoop?: boolean, transitionDuration?: number) => Promise<void>;
  getLoadedAnimation: (animationId: string) => THREE.AnimationClip | null;
  isModelReady: boolean;
  currentExpression?: string;
  preloadError?: string | null;
  isCriticalAnimationReady?: boolean;
}

// VRM Viewer Props
export interface VRMViewerProps {
  vrmUrl?: string;
  basePath?: string;
  isAISpeaking?: boolean;
  audioVolume?: number;
  audioCurrentTime?: number;
  audioDuration?: number;
  eyeClosure?: number;
  visemeId?: string;
  emotion?: string | null;
  emotionStrength?: number;
  activeAnimationId?: string | null;
  activeAnimationToken?: number;
  onReadyToTalk?: () => void;
  onLoadComplete?: () => void;
  kiss?: number;
  lipsClosed?: number;
  jaw?: number;
  // Customization
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  lightIntensity?: number;
  // Animation transition settings
  transitionDuration?: number;
  idleTransitionDuration?: number;
  animationSpeed?: number;
  // Click-through support for desktop apps
  onAnimationEnd?: () => void;
  onLoopAboutToRepeat?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  onPointerDown?: (event: any) => void;
  onPointerUp?: (event: any) => void;
  animationRegistry?: Record<string, any>;
}

export interface VRMModelProps extends VRMViewerProps {
  isAudioPlaying?: boolean;
}

// Animation Loader Types
export interface AnimationCache {
  [key: string]: THREE.AnimationClip | null;
}

export interface LoadingState {
  [key: string]: 'idle' | 'loading' | 'loaded' | 'error';
}

export interface UseVrmAnimationLoaderReturn {
  loadAnimation: (animationId: string) => Promise<THREE.AnimationClip | null>;
  getLoadedAnimation: (animationId: string) => THREE.AnimationClip | null;
  isLoading: (animationId: string) => boolean;
  preloadedAnimations: string[];
  unloadAnimation: (animationId: string) => void;
  loadingStates: LoadingState;
  preloadError: string | null;
  isCriticalAnimationReady: boolean;
}

// Animation Player Types
export interface UseVrmAnimationPlayerParams {
  vrm: VRM | null;
  defaultClip: THREE.AnimationClip | null;
  loop?: boolean;
  onAnimationComplete?: () => void;
  transitionDuration?: number;
  animationSpeed?: number;
  onLoopAboutToRepeat?: () => void;
  loopPreventionThreshold?: number;
}

export interface UseVrmAnimationPlayerReturn {
  playAnimation: (
    clip: THREE.AnimationClip | null,
    shouldLoop?: boolean,
    customTransitionDuration?: number,
    bodyPartOverride?: AnimationBodyPart | 'full'
  ) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPlaying: boolean;
  currentTime: number;
}

// Expression Types
export interface UseVrmExpressionParams {
  vrm: VRM | null;
  emotion: string | null;
  emotionStrength?: number;
}

export interface UseVrmExpressionReturn {
  currentExpression: string;
  setCurrentExpression: (expression: string) => void;
  allExpressions: {
    emotions: string[];
    visemes: string[];
    blinks: string[];
  };
}

// Lipsync Types
export interface UseVrmLipsyncParams {
  vrm: VRM | null;
  audioVolume?: number;
  isAudioPlaying?: boolean;
  setCurrentExpression?: (expr: string) => void;
  eyeClosure?: number;
  visemeId?: string | null;
}

export interface StreamingLipsyncOptions {
  onAudioAnalysis?: (volume: number, currentTime: number, duration: number, emotion?: string) => void;
}

// Chat Audio WebSocket Types
export interface SentenceEntry {
  sentence: string;
  animation?: string | null;
  startTime: number;
  endTime: number;
}

export interface ChatAudioState {
  isConnected: boolean;
  isPlaying: boolean;
  currentSentence: string;
  currentAnimation: string | null;
  currentAnimationToken: number;
  fullText: string;
  audioVolume: number;
  audioCurrentTime: number;
  audioDuration: number;
  kiss: number;
  lipsClosed: number;
  jaw: number;
  sendMessage: (message: string) => void;
  sendTalk: (payload?: Partial<TalkEventPayload>) => void;
}

export interface TalkEventPayload {
  message: string;
  topic?: string;
  guide?: string;
  character_name?: string;
  thread_id?: string;
}

// Look At Options
export interface UseVrmLookAtOptions {
  enabled?: boolean;
  smoothness?: number;
}
