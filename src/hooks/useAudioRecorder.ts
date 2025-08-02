'use client';

import { useState, useRef, useCallback } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isInitialized: boolean;
  error: string | null;
  audioLevel: number;
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  initializeRecorder: () => Promise<void>;
  cleanup: () => void;
}

export const useAudioRecorder = (
  onAudioData?: (audioData: ArrayBuffer) => void,
  options: {
    sampleRate?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
  } = {}
): UseAudioRecorderReturn => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isInitialized: false,
    error: null,
    audioLevel: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    sampleRate = 44100,
    echoCancellation = true,
    noiseSuppression = true
  } = options;

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onAudioData) {
          event.data.arrayBuffer().then(onAudioData);
        }
      };

      mediaRecorderRef.current = mediaRecorder;

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
  }, [sampleRate, echoCancellation, noiseSuppression, onAudioData]);

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !state.isInitialized) {
      await initializeRecorder();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start(100); // Send data every 100ms
      setState(prev => ({ ...prev, isRecording: true, error: null }));
      updateAudioLevel();
    }
  }, [state.isInitialized, initializeRecorder, updateAudioLevel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

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

    mediaRecorderRef.current = null;
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