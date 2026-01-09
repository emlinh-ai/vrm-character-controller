/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import VRMModel from './VRMModel';
import type { VRMViewerProps, VRMModelRef } from '../types';

/**
 * VRMViewer - Main component để render VRM character với lighting
 * Sử dụng bên trong Canvas từ @react-three/fiber
 */
const VRMViewer: React.FC<VRMViewerProps> = ({
  vrmUrl = 'emlinh-vroid-1.1.vrm',
  basePath = 'models',
  isAISpeaking = false,
  audioVolume = 0,
  audioCurrentTime = 0,
  audioDuration = 0,
  emotion = 'neutral',
  activeAnimationId = null,
  activeAnimationToken,
  onReadyToTalk,
  kiss = 0,
  lipsClosed = 0,
  jaw = 0,
  position = [0.55, -1.25, 0],
  rotation = [0, -1.75 / Math.PI, 0],
  scale = 1,
  lightIntensity = 1,
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

    vrmModelRef.current.playAnimationById(activeAnimationId, false);
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
        onPointerOut={onPointerOut}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
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
          onReadyToTalk={onReadyToTalk}
          kiss={kiss}
          lipsClosed={lipsClosed}
          jaw={jaw}
          animationRegistry={animationRegistry}
        />
      </group>
    </>
  );
};

export default VRMViewer;
