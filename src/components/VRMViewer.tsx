/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import VRMModel from './VRMModel';
import type { VRMViewerProps, VRMModelRef } from '../types';

/**
 * VRMViewer - Main component để render VRM character với lighting
 * Sử dụng bên trong Canvas từ @react-three/fiber
 */
const VRMViewer: React.FC<VRMViewerProps> = ({
  vrmUrl = 'emlinhv3.vrm',
  basePath = 'models',
  isAISpeaking = false,
  audioVolume = 0,
  audioCurrentTime = 0,
  audioDuration = 0,
  emotion = 'neutral',
  eyeClosure = 0,
  visemeId = null,
  activeAnimationId = null,
  activeAnimationToken,
  onReadyToTalk,
  onLoadComplete,
  onAnimationEnd,
  onLoopAboutToRepeat,
  kiss = 0,
  lipsClosed = 0,
  jaw = 0,
  position = [0.55, -1.25, 0],
  rotation = [0, -1.75 / Math.PI, 0],
  scale = 1,
  lightIntensity = 1,
  transitionDuration = 0.5,
  idleTransitionDuration = 1.0,
  animationSpeed = 1.0,
  emotionStrength = 1.0,
  onPointerOver,
  onPointerOut,
  onPointerDown,
  onPointerUp,
  animationRegistry = {},
}) => {
  const vrmModelRef = useRef<VRMModelRef>(null);

  useEffect(() => {
    if (vrmModelRef.current) {
      if (isAISpeaking) {
        vrmModelRef.current.startTalking();
      } else {
        vrmModelRef.current.stopTalking();
      }
    }
  }, [isAISpeaking]);

  useEffect(() => {
    if (!vrmModelRef.current || !activeAnimationId) return;

    // Không ép loop = false để idle có thể tự loop theo category
    vrmModelRef.current.playAnimationById(activeAnimationId);
  }, [activeAnimationId, activeAnimationToken]);

  return (
    <>
      <ambientLight intensity={lightIntensity * 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={lightIntensity} />
      <group 
        position={position} 
        rotation={rotation} 
        scale={scale}
        onPointerOver={onPointerOver}
      >
        <VRMModel
          ref={vrmModelRef}
          vrmUrl={vrmUrl}
          basePath={basePath}
          audioVolume={audioVolume}
          audioCurrentTime={audioCurrentTime}
          audioDuration={audioDuration}
          isAudioPlaying={isAISpeaking}
          emotion={emotion}
          eyeClosure={eyeClosure}
          visemeId={visemeId || undefined}
          onReadyToTalk={onReadyToTalk}
          onLoadComplete={onLoadComplete}
          onAnimationEnd={onAnimationEnd}
          onLoopAboutToRepeat={onLoopAboutToRepeat}
          kiss={kiss}
          lipsClosed={lipsClosed}
          jaw={jaw}
          animationRegistry={animationRegistry}
          activeAnimationId={activeAnimationId}
          transitionDuration={transitionDuration}
          idleTransitionDuration={idleTransitionDuration}
          animationSpeed={animationSpeed}
          emotionStrength={emotionStrength}
        />
      </group>
    </>
  );
};

export default VRMViewer;
