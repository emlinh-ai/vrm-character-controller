import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import type { EnvironmentModelProps } from '../types';

const resolveModelUrl = (modelUrl: string, basePath?: string) => {
  if (!basePath) return modelUrl;
  if (modelUrl.startsWith('http') || modelUrl.startsWith('/')) return modelUrl;

  const normalizedBase = basePath.replace(/\/$/, '');
  const normalizedModel = modelUrl.replace(/^\//, '');
  return `${normalizedBase}/${normalizedModel}`;
};

const EnvironmentModel: React.FC<EnvironmentModelProps> = ({
  modelUrl,
  basePath,
  position = [0, -0.5, 0],
  rotation = [0, -1, 0],
  scale = 1,
  castShadow = true,
  receiveShadow = true,
  controlsLabel = 'Environment 3D',
}) => {
  const resolvedUrl = useMemo(() => resolveModelUrl(modelUrl, basePath), [modelUrl, basePath]);
  const { scene } = useGLTF(resolvedUrl);

  useEffect(() => {
    const tuneMaterial = (material: THREE.Material) => {
      const typedMaterial = material as THREE.MeshStandardMaterial;

      if ('map' in typedMaterial && typedMaterial.map) {
        typedMaterial.map.colorSpace = THREE.SRGBColorSpace;
      }

      if ('envMapIntensity' in typedMaterial) {
        typedMaterial.envMapIntensity = typedMaterial.envMapIntensity ?? 1;
      }

      if ('metalness' in typedMaterial) {
        typedMaterial.metalness = 0;
      }

      if ('vertexColors' in typedMaterial) {
        typedMaterial.vertexColors = false;
      }

      typedMaterial.needsUpdate = true;
    };

    scene.traverse((child) => {
      if (child instanceof THREE.Light) {
        child.visible = true;
        if ('intensity' in child) {
          child.intensity = Math.max(child.intensity, 1.0);
        }
      }

      if (child instanceof THREE.Mesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;

        if (child.geometry?.attributes?.uv && !child.geometry.attributes.uv2) {
          child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
        }

        if (child.geometry?.computeVertexNormals) {
          child.geometry.computeVertexNormals();
        }

        if (Array.isArray(child.material)) {
          child.material.forEach(tuneMaterial);
        } else if (child.material) {
          tuneMaterial(child.material);
        }
      }
    });
  }, [scene, castShadow, receiveShadow]);

  const controls = useControls(controlsLabel, {
    position: { value: position, step: 0.01 },
    rotation: { value: rotation, step: 0.01 },
    scale: { value: scale, min: 0.01, max: 10, step: 0.01 },
  });

  return (
    <group
      position={controls.position as [number, number, number]}
      rotation={controls.rotation as [number, number, number]}
      scale={controls.scale as number}
    >
      <primitive object={scene} />
    </group>
  );
};

export default EnvironmentModel;
