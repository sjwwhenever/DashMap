'use client';

import { useState, useRef, useCallback } from 'react';

export interface PCMAudioRecorderState {
  isRecording: boolean;
  isInitialized: boolean;
  error: string | null;
  audioLevel: number;
}

export interface UsePCMAudioRecorderReturn extends PCMAudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  initializeRecorder: () => Promise<void>;
  cleanup: () => void;
}

export const usePCMAudioRecorder = (
  onAudioData?: (audioData: ArrayBuffer) => void,
  options: {
    sampleRate?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    connectionCheck?: () => boolean;
  } = {}
): UsePCMAudioRecorderReturn => {
  const [state, setState] = useState<PCMAudioRecorderState>({
    isRecording: false,
    isInitialized: false,
    error: null,
    audioLevel: 0
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    sampleRate = 16000,
    echoCancellation = true,
    noiseSuppression = true,
    connectionCheck
  } = options;

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
    const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
    const normalizedLevel = average / 255;

    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
    
    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [state.isRecording]);

  const initializeRecorder = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          echoCancellation,
          noiseSuppression,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // Create script processor for raw PCM data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (!state.isRecording) return;

        // Check if connection is ready before sending audio
        if (connectionCheck && !connectionCheck()) {
          console.log('⏳ [PCMAudioRecorder] Connection not ready, skipping audio chunk');
          return;
        }

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
        }

        if (onAudioData) {
          onAudioData(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setState(prev => ({
        ...prev,
        isInitialized: true,
        error: null
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize audio recorder';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isInitialized: false
      }));
      throw error;
    }
  }, [sampleRate, echoCancellation, noiseSuppression, onAudioData, connectionCheck, state.isRecording]);

  const startRecording = useCallback(async () => {
    if (!state.isInitialized) {
      await initializeRecorder();
    }

    setState(prev => ({ ...prev, isRecording: true, error: null }));
    updateAudioLevel();
  }, [state.isInitialized, initializeRecorder, updateAudioLevel]);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      audioLevel: 0
    }));
  }, []);

  const cleanup = useCallback(() => {
    stopRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    processorRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;

    setState({
      isRecording: false,
      isInitialized: false,
      error: null,
      audioLevel: 0
    });
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    initializeRecorder,
    cleanup
  };
};