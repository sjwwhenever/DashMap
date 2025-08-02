'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConversationMessage {
  type: 'user_audio_chunk' | 'agent_response' | 'user_transcript' | 'agent_transcript' | 'conversation_initiation';
  data?: any;
  audio?: ArrayBuffer;
  transcript?: string;
  timestamp: number;
}

export interface UseElevenLabsWebSocketReturn {
  connectionState: ConnectionState;
  messages: ConversationMessage[];
  error: string | null;
  connect: (agentId: string) => Promise<void>;
  disconnect: () => void;
  sendAudioChunk: (audioData: ArrayBuffer) => void;
  sendMessage: (message: string) => void;
  clearMessages: () => void;
}

const WEBSOCKET_URL = 'wss://api.elevenlabs.io/v1/convai/conversation';

export const useElevenLabsWebSocket = (apiKey: string): UseElevenLabsWebSocketReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAudioResponse = useCallback(async (audioData: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio response:', error);
    }
  }, []);

  const connect = useCallback(async (agentId: string) => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);

      const wsUrl = `${WEBSOCKET_URL}?agent_id=${agentId}`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        
        // Send initial authentication
        const authMessage = {
          type: 'conversation_initiation',
          api_key: apiKey,
          agent_id: agentId
        };
        websocket.send(JSON.stringify(authMessage));

        // Add connection message
        setMessages(prev => [...prev, {
          type: 'conversation_initiation',
          data: { agent_id: agentId },
          timestamp: Date.now()
        }]);
      };

      websocket.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            // Handle binary audio data
            const audioData = await event.data.arrayBuffer();
            
            setMessages(prev => [...prev, {
              type: 'agent_response',
              audio: audioData,
              timestamp: Date.now()
            }]);

            // Play the audio response
            await playAudioResponse(audioData);
          } else {
            // Handle JSON messages
            const message = JSON.parse(event.data);
            
            if (message.type === 'agent_transcript') {
              setMessages(prev => [...prev, {
                type: 'agent_transcript',
                transcript: message.transcript,
                timestamp: Date.now()
              }]);
            } else if (message.type === 'user_transcript') {
              setMessages(prev => [...prev, {
                type: 'user_transcript',
                transcript: message.transcript,
                timestamp: Date.now()
              }]);
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionState('error');
      };

      websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        
        if (event.code !== 1000) {
          setError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
        }
      };

      websocketRef.current = websocket;

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
      setConnectionState('error');
    }
  }, [apiKey, playAudioResponse]);

  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'User disconnected');
      websocketRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setConnectionState('disconnected');
    setError(null);
  }, []);

  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (websocketRef.current && connectionState === 'connected') {
      // Convert audio data to base64 for sending
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));
      
      const message = {
        type: 'user_audio_chunk',
        audio_data: base64Audio
      };

      websocketRef.current.send(JSON.stringify(message));

      setMessages(prev => [...prev, {
        type: 'user_audio_chunk',
        audio: audioData,
        timestamp: Date.now()
      }]);
    }
  }, [connectionState]);

  const sendMessage = useCallback((message: string) => {
    if (websocketRef.current && connectionState === 'connected') {
      const messageData = {
        type: 'user_message',
        message: message
      };

      websocketRef.current.send(JSON.stringify(messageData));
    }
  }, [connectionState]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    messages,
    error,
    connect,
    disconnect,
    sendAudioChunk,
    sendMessage,
    clearMessages
  };
};