/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useStreamingLipsync } from './useStreamingLipsync';
import { Lipsync } from '../utils/threelipsync';
import type { ChatAudioState, TalkEventPayload } from '../types';

const DEFAULT_THREAD_ID = 'chat-character-api';

interface UseChatAudioWebSocketOptions {
  wsUrl: string;
  threadId?: string;
  autoConnect?: boolean;
}

/**
 * Hook để kết nối WebSocket chat với TTS streaming
 * Phù hợp cho chat với nhân vật 3D
 */
export function useChatAudioWebSocket(options: UseChatAudioWebSocketOptions): ChatAudioState {
  const { wsUrl, threadId = DEFAULT_THREAD_ID, autoConnect = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [fullText, setFullText] = useState('');
  const [currentAnimationToken, setCurrentAnimationToken] = useState(0);
  const [kiss, setKiss] = useState(0);
  const [lipsClosed, setLipsClosed] = useState(0);
  const [jaw, setJaw] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackQueueTimeRef = useRef(0);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const lipsyncRef = useRef<any>(null);
  const lipsyncFrameRef = useRef<number | null>(null);
  const lastSentenceRef = useRef<string | null>(null);

  const {
    processAudioChunk,
    cleanup: cleanupLipsync,
    attachExternalAudio,
    audioVolume,
    audioCurrentTime,
    audioDuration,
    isAnalyzing,
  } = useStreamingLipsync({ onAudioAnalysis: () => {} });

  const isPlaying = isConnected && (isAnalyzing || audioVolume > 0.01);

  function ensurePlaybackAudioContext() {
    if (!playbackAudioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      playbackAudioContextRef.current = ctx;
      playbackQueueTimeRef.current = ctx.currentTime;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.1;
      playbackAnalyserRef.current = analyser;

      analyser.connect(ctx.destination);
      attachExternalAudio(analyser, ctx);

      if (!lipsyncRef.current) {
        const lipsync = new Lipsync(ctx, analyser, 0.45, 0.6, 1.0);
        lipsync.setLipSyncCallback((k: number, l: number, j: number) => {
          setKiss(k);
          setLipsClosed(l);
          setJaw(j);
        });
        lipsyncRef.current = lipsync;

        const updateLipsync = () => {
          if (!lipsyncRef.current) return;
          lipsyncRef.current.update();
          lipsyncFrameRef.current = requestAnimationFrame(updateLipsync);
        };

        lipsyncFrameRef.current = requestAnimationFrame(updateLipsync);
      }
    }
  }

  function playAudioChunk(float32: Float32Array): { startAt: number; endAt: number } | null {
    if (float32.length === 0) return null;

    ensurePlaybackAudioContext();
    const ctx = playbackAudioContextRef.current!;

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    const channelData = buffer.getChannelData(0);
    channelData.set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (playbackAnalyserRef.current) {
      source.connect(playbackAnalyserRef.current);
    } else {
      source.connect(ctx.destination);
    }

    const startAt = Math.max(playbackQueueTimeRef.current, ctx.currentTime);
    const endAt = startAt + buffer.duration;
    source.start(startAt);
    playbackQueueTimeRef.current = endAt;

    processAudioChunk(float32, startAt);

    return { startAt, endAt };
  }

  useEffect(() => {
    if (!autoConnect) return;

    const fullWsUrl = `${wsUrl}?thread_id=${threadId}`;
    const ws = new WebSocket(fullWsUrl);
    wsRef.current = ws;
    setIsConnected(false);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('✅ Chat WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'chunk') {
          let playbackTimes: { startAt: number; endAt: number } | null = null;
          let isNewSentenceForThisChunk = false;

          if (data.audio) {
            const binary = atob(data.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            
            // Backend gửi Int16 PCM (pcm_s16le), cần convert sang Float32
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768.0; // Normalize Int16 (-32768..32767) to Float32 (-1..1)
            }
            
            playbackTimes = playAudioChunk(float32);
          }

          if (data.sentence) {
            const ctx = playbackAudioContextRef.current;

            if (data.sentence !== lastSentenceRef.current) {
              lastSentenceRef.current = data.sentence;
              isNewSentenceForThisChunk = true;
            }

            if (playbackTimes && ctx) {
              const delayMs = Math.max(0, (playbackTimes.startAt - ctx.currentTime) * 1000);
              window.setTimeout(() => {
                setCurrentSentence(data.sentence);
              }, delayMs);
            } else {
              setCurrentSentence(data.sentence);
            }
          }

          if (typeof data.full_text === 'string') {
            setFullText(data.full_text);
          }

          if (data.animation && isNewSentenceForThisChunk && data.animation !== 'idle') {
            const ctx = playbackAudioContextRef.current;
            if (playbackTimes && ctx) {
              const delayMs = Math.max(0, (playbackTimes.startAt - ctx.currentTime) * 1000);
              window.setTimeout(() => {
                setCurrentAnimation(data.animation || null);
                setCurrentAnimationToken((prev) => prev + 1);
              }, delayMs);
            } else {
              setCurrentAnimation(data.animation || null);
              setCurrentAnimationToken((prev) => prev + 1);
            }
          }
        } else if (data.type === 'completed') {
          if (typeof data.full_text === 'string') {
            setFullText(data.full_text);
          }
        }
      } catch (err) {
        console.error('WS message parse error', err, event.data);
      }
    };

    ws.onerror = (err) => {
      console.error('WS error', err);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('❌ Chat WebSocket disconnected');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      cleanupLipsync();

      if (playbackAudioContextRef.current) {
        playbackAudioContextRef.current.close();
        playbackAudioContextRef.current = null;
      }

      if (lipsyncFrameRef.current !== null) {
        cancelAnimationFrame(lipsyncFrameRef.current);
        lipsyncFrameRef.current = null;
      }
      lipsyncRef.current = null;
    };
  }, [wsUrl, threadId, autoConnect]);

  const sendMessage = (message: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    ws.send(JSON.stringify({ type: 'chat', message }));
  };

  const sendTalk = (payload: Partial<TalkEventPayload> = {}) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const defaultPayload: TalkEventPayload = {
      message: 'talk',
      thread_id: threadId,
    };

    const body = { ...defaultPayload, ...payload };
    ws.send(JSON.stringify({ type: 'talk', ...body }));
  };

  return {
    isConnected,
    isPlaying,
    currentSentence,
    currentAnimation,
    currentAnimationToken,
    fullText,
    audioVolume,
    audioCurrentTime,
    audioDuration,
    kiss,
    lipsClosed,
    jaw,
    sendMessage,
    sendTalk,
  };
}
