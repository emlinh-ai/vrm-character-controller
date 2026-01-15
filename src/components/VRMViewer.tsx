/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { useControls } from 'leva';
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
  backgroundImageUrl = '/assets/images/background-studio.jpg',
  backgroundPosition = [0, 0.75, -0.9],
  backgroundSize = [6, 3.5],
  backgroundShadowOpacity = 0.35,
  backgroundLightPosition = [9, 10, 6],
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
  const backgroundTexture = useTexture(backgroundImageUrl);
  const backgroundControls = useControls('Background', {
    position: { value: backgroundPosition, step: 0.01 },
    size: { value: backgroundSize, step: 0.1 },
    shadowOpacity: { value: backgroundShadowOpacity, min: 0, max: 1, step: 0.01 },
    lightPosition: { value: backgroundLightPosition, step: 0.1 },
  });

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
      <group position={backgroundControls.position as [number, number, number]}>
        <mesh>
          <planeGeometry args={backgroundControls.size as [number, number]} />
          <meshBasicMaterial map={backgroundTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]} receiveShadow>
          <planeGeometry args={backgroundControls.size as [number, number]} />
          <shadowMaterial transparent opacity={backgroundControls.shadowOpacity as number} />
        </mesh>
      </group>
      <ambientLight intensity={lightIntensity * 0.7} />
      <directionalLight
        position={backgroundControls.lightPosition as [number, number, number]}
        intensity={lightIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <group
        position={position}
        rotation={rotation}
        scale={scale}
        onPointerOver={onPointerOver}
        castShadow
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
