import React, { useEffect } from 'react';
import { useVideoTexture } from '@react-three/drei';
import { useControls } from 'leva';
import { useThree } from '@react-three/fiber';
import { LinearFilter } from 'three';

interface BackgroundBackdropProps {
  videoUrl: string;
  position: [number, number, number];
  size: [number, number];
  shadowOpacity: number;
  lightPosition: [number, number, number];
  lightIntensity: number;
}

const BackgroundBackdrop: React.FC<BackgroundBackdropProps> = ({
  videoUrl,
  position,
  size,
  shadowOpacity,
  lightPosition,
  lightIntensity,
}) => {
  const { gl } = useThree();
  const videoTexture = useVideoTexture(videoUrl, {
    loop: true,
    muted: true,
    autoplay: true,
    start: true,
  });

  useEffect(() => {
    if (!videoTexture) {
      return;
    }

    videoTexture.generateMipmaps = false;
    videoTexture.minFilter = LinearFilter;
    videoTexture.magFilter = LinearFilter;
    videoTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
    videoTexture.needsUpdate = true;
  }, [gl, videoTexture]);

  const controls = useControls('Background', {
    position: { value: position, step: 0.01 },
    size: { value: size, step: 0.1 },
    shadowOpacity: { value: shadowOpacity, min: 0, max: 1, step: 0.01 },
    lightPosition: { value: lightPosition, step: 0.1 },
  });

  return (
    <>
      <group position={controls.position as [number, number, number]}>
        <mesh>
          <planeGeometry args={controls.size as [number, number]} />
          <meshBasicMaterial map={videoTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]} receiveShadow>
          <planeGeometry args={controls.size as [number, number]} />
          <shadowMaterial transparent opacity={controls.shadowOpacity as number} />
        </mesh>
      </group>
      <ambientLight intensity={lightIntensity * 0.5} />
      <directionalLight
        position={controls.lightPosition as [number, number, number]}
        intensity={lightIntensity * 0.5}
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
  );
};

export default BackgroundBackdrop;
