/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import VRMModel from './VRMModel';
import BackgroundBackdrop from './BackgroundBackdrop';
import EnvironmentModel from './EnvironmentModel';
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
  backgroundVideoUrl = '/assets/video/river-background.mp4',
  backgroundPosition = [0, 0.75, -0.9],
  backgroundSize = [6, 3.4],
  backgroundShadowOpacity = 0.35,
  backgroundLightPosition = [-9, 10, 6],
  lightIntensity = 1,
  environmentModelUrl,
  environmentBasePath,
  environmentPosition = [0, -0.5, 0],
  environmentRotation = [0, -1, 0],
  environmentScale = 1,
  environmentCastShadow = true,
  environmentReceiveShadow = true,
  environmentControlsLabel = 'Environment 3D',
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
  const { camera } = useThree();

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

  const hasEnvironmentModel = Boolean(environmentModelUrl);

  return (
    <>
      {!hasEnvironmentModel && (
        <BackgroundBackdrop
          videoUrl={backgroundVideoUrl}
          position={backgroundPosition}
          size={backgroundSize}
          shadowOpacity={backgroundShadowOpacity}
          lightPosition={backgroundLightPosition}
          lightIntensity={lightIntensity}
        />
      )}
      {hasEnvironmentModel && environmentModelUrl && (
        <>
          <EnvironmentModel
            modelUrl={environmentModelUrl}
            basePath={environmentBasePath}
            position={environmentPosition}
            rotation={environmentRotation}
            scale={environmentScale}
            castShadow={environmentCastShadow}
            receiveShadow={environmentReceiveShadow}
            controlsLabel={environmentControlsLabel}
          />
          <ambientLight intensity={lightIntensity * 0.9} />
          <hemisphereLight
            intensity={lightIntensity * 0.6}
            color="#ffffff"
            groundColor="#7a7a7a"
          />
          <directionalLight
            position={[camera.position.x, camera.position.y, camera.position.z]}
            intensity={lightIntensity * 1.2}
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
        </>
      )}
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
