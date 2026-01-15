// Components
export { default as VRMViewer } from './components/VRMViewer';
export { default as VRMModel } from './components/VRMModel';
export { default as EnvironmentModel } from './components/EnvironmentModel';

// Hooks
export { useVrmBlink } from './hooks/useVrmBlink';
export { useVrmLookAt } from './hooks/useVrmLookAt';
export { useVrmExpression } from './hooks/useVrmExpression';
export { useVrmLipsync } from './hooks/useVrmLipsync';
export { useVrmAnimationLoader } from './hooks/useVrmAnimationLoader';
export { useVrmAnimationPlayer } from './hooks/useVrmAnimationPlayer';
export { useStreamingLipsync } from './hooks/useStreamingLipsync';
export { useChatAudioWebSocket } from './hooks/useChatAudioWebSocket';
export { useIdleAnimationSelector } from './hooks/useIdleAnimationSelector';
export { useTalkingAnimationSelector } from './hooks/useTalkingAnimationSelector';

// Constants
export {
  registerAnimation,
  getAnimationById,
  getPreloadAnimations,
  getAnimationsByCategory,
  getRandomIdleAnimation,
  getRandomTalkingAnimation,
} from './constants/animation-registry';

// Utils
export { Lipsync } from './utils/threelipsync';
export { remapMixamoAnimationToVrm } from './utils/remapMixamoAnimationToVrm';
export { cleanAnimationTracks, cleanMultipleAnimationTracks } from './utils/cleanAnimationTracks';
export { mixamoVRMRigMap } from './utils/mixamoVRMRigMap';

// Types
export type {
  AnimationType,
  AnimationCategory,
  AnimationDefinition,
  VRMModelProps,
  VRMModelRef,
  VRMViewerProps,
  EnvironmentModelProps,
  AnimationCache,
  LoadingState,
  UseVrmAnimationLoaderReturn,
  UseVrmAnimationPlayerParams,
  UseVrmAnimationPlayerReturn,
  UseVrmExpressionParams,
  UseVrmExpressionReturn,
  UseVrmLipsyncParams,
  StreamingLipsyncOptions,
  SentenceEntry,
  ChatAudioState,
  TalkEventPayload,
  UseVrmLookAtOptions,
} from './types';
