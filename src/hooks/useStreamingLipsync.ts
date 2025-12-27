/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useCallback, useState } from 'react';
import type { StreamingLipsyncOptions } from '../types';

export const useStreamingLipsync = (options?: StreamingLipsyncOptions) => {
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const isAnalyzingRef = useRef<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const useExternalRef = useRef<boolean>(false);
  const createdInternallyRef = useRef<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const totalSamplesRef = useRef<number>(0);
  const sampleRate = 24000;

  const smoothedVolumeRef = useRef<number>(0);
  const volumeHistoryRef = useRef<number[]>([]);
  const audioBufferRef = useRef<Float32Array[]>([]);

  const syllableDetectionRef = useRef<{
    lastVolumeSpike: number;
    mouthCyclePhase: number;
    cycleSpeed: number;
    isInSyllable: boolean;
    syllableStartTime: number;
    minSyllableDuration: number;
  }>({
    lastVolumeSpike: 0,
    mouthCyclePhase: 0,
    cycleSpeed: 0.05,
    isInSyllable: false,
    syllableStartTime: 0,
    minSyllableDuration: 0.1,
  });

  const initializeAudioContext = useCallback(() => {
    if (useExternalRef.current) {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return audioContextRef.current!;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate });
      createdInternallyRef.current = true;
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.1;
      if (!silentGainRef.current) {
        silentGainRef.current = audioContextRef.current.createGain();
        silentGainRef.current.gain.value = 0;
      }
      analyserRef.current.connect(silentGainRef.current);
      silentGainRef.current.connect(audioContextRef.current.destination);
    }

    return audioContextRef.current;
  }, []);

  const attachExternalAudio = useCallback((analyser: AnalyserNode, audioContext: AudioContext) => {
    analyserRef.current = analyser;
    audioContextRef.current = audioContext;
    useExternalRef.current = true;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const analyzeStreamingAudio = useCallback(() => {
    if (!analyserRef.current || !isAnalyzingRef.current) return;

    const freqLen = analyserRef.current.frequencyBinCount;
    const freqArray = new Uint8Array(freqLen);
    analyserRef.current.getByteFrequencyData(freqArray);

    const midStart = Math.floor(freqLen * 0.1);
    const midEnd = Math.floor(freqLen * 0.7);
    let sum = 0;
    let count = 0;
    for (let i = midStart; i < midEnd; i++) {
      sum += freqArray[i];
      count++;
    }
    let rawVolume = count > 0 ? sum / count / 255 : 0;

    rawVolume = Math.pow(rawVolume, 0.6);
    rawVolume = Math.min(rawVolume * 2.5, 1.0);

    volumeHistoryRef.current.push(rawVolume);
    if (volumeHistoryRef.current.length > 5) {
      volumeHistoryRef.current.shift();
    }

    const smoothedVolume =
      volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length;
    const smoothingFactor = 0.3;
    smoothedVolumeRef.current =
      smoothedVolumeRef.current * (1 - smoothingFactor) + smoothedVolume * smoothingFactor;

    let currentTime = 0;
    if (audioContextRef.current && startTimeRef.current > 0) {
      currentTime = Math.max(0, audioContextRef.current.currentTime - startTimeRef.current);
    }
    const estimatedDuration =
      audioBufferRef.current.reduce((total, chunk) => total + chunk.length, 0) / sampleRate;

    const detection = syllableDetectionRef.current;
    const volumeThreshold = 0.05;
    const spikeThreshold = 0.08;

    const volumeIncrease = smoothedVolumeRef.current - detection.lastVolumeSpike;
    const timeSinceLastSpike = currentTime - detection.syllableStartTime;

    if (
      smoothedVolumeRef.current > volumeThreshold &&
      volumeIncrease > spikeThreshold &&
      timeSinceLastSpike > detection.minSyllableDuration
    ) {
      detection.isInSyllable = true;
      detection.syllableStartTime = currentTime;
      detection.mouthCyclePhase = 0;
    }

    if (detection.isInSyllable) {
      detection.mouthCyclePhase += detection.cycleSpeed;
      if (
        detection.mouthCyclePhase >= 1.0 ||
        (smoothedVolumeRef.current < volumeThreshold * 0.3 && detection.mouthCyclePhase > 0.3)
      ) {
        detection.mouthCyclePhase = 0;
        detection.isInSyllable = false;
      }
    }

    let mouthOpening = 0;
    if (smoothedVolumeRef.current > volumeThreshold * 0.5) {
      if (detection.isInSyllable && detection.mouthCyclePhase < 1.0) {
        const sinePhase = detection.mouthCyclePhase * Math.PI;
        mouthOpening = Math.sin(sinePhase) * smoothedVolumeRef.current * 1.5;
      } else {
        mouthOpening = smoothedVolumeRef.current * 0.8;
      }
    }

    detection.lastVolumeSpike = smoothedVolumeRef.current;

    setAudioVolume(mouthOpening);
    setAudioCurrentTime(currentTime);
    setAudioDuration(estimatedDuration);

    if (options?.onAudioAnalysis) {
      options.onAudioAnalysis(mouthOpening, currentTime, estimatedDuration);
    }

    animationFrameRef.current = requestAnimationFrame(analyzeStreamingAudio);
  }, [options]);

  const processAudioChunk = useCallback(
    (audioData: Float32Array, scheduledStartAt?: number) => {
      try {
        const audioContext = initializeAudioContext();

        audioBufferRef.current.push(audioData);

        if (!useExternalRef.current) {
          const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
          audioBuffer.copyToChannel(audioData, 0);

          const sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(analyserRef.current!);

          const startTime = audioContext.currentTime;
          sourceNode.start(startTime);
          sourceNodeRef.current = sourceNode;

          if (startTimeRef.current === 0) {
            startTimeRef.current = startTime;
          }
        } else {
          if (typeof scheduledStartAt === 'number' && startTimeRef.current === 0) {
            startTimeRef.current = scheduledStartAt;
          }
        }

        totalSamplesRef.current += audioData.length;

        if (!isAnalyzingRef.current) {
          isAnalyzingRef.current = true;
          setIsAnalyzing(true);
          analyzeStreamingAudio();
        }
      } catch (error) {
        console.error('Error processing audio chunk:', error);
      }
    },
    [initializeAudioContext, analyzeStreamingAudio]
  );

  const stopAnalysis = useCallback(() => {
    isAnalyzingRef.current = false;
    setIsAnalyzing(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    syllableDetectionRef.current = {
      lastVolumeSpike: 0,
      mouthCyclePhase: 0,
      cycleSpeed: 0.05,
      isInSyllable: false,
      syllableStartTime: 0,
      minSyllableDuration: 0.1,
    };

    smoothedVolumeRef.current = 0;
    volumeHistoryRef.current = [];
    audioBufferRef.current = [];
    totalSamplesRef.current = 0;
    startTimeRef.current = 0;

    setAudioVolume(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, []);

  const cleanup = useCallback(() => {
    stopAnalysis();

    if (audioContextRef.current && createdInternallyRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    sourceNodeRef.current = null;
    silentGainRef.current = null;
    useExternalRef.current = false;
    createdInternallyRef.current = false;
  }, [stopAnalysis]);

  return {
    processAudioChunk,
    stopAnalysis,
    cleanup,
    attachExternalAudio,
    audioVolume,
    audioCurrentTime,
    audioDuration,
    isAnalyzing,
  };
};
