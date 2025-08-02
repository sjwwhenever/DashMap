'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { convertWebMToPCM } from '@/utils/audioUtils';

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

      console.log('🔊 [WebSocket] Attempting to play audio, size:', audioData.byteLength);
      
      // Try to decode and play the audio
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      console.log('✅ [WebSocket] Audio played successfully');
    } catch (error) {
      console.error('❌ [WebSocket] Error playing audio response:', error);
      
      // Try alternative decoding for PCM data
      try {
        console.log('🔄 [WebSocket] Trying alternative PCM decoding...');
        const pcmData = new Int16Array(audioData);
        const audioBuffer = audioContextRef.current!.createBuffer(1, pcmData.length, 16000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < pcmData.length; i++) {
          channelData[i] = pcmData[i] / 32767;
        }
        
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        source.start();
        
        console.log('✅ [WebSocket] PCM audio played successfully');
      } catch (pcmError) {
        console.error('❌ [WebSocket] PCM decoding also failed:', pcmError);
      }
    }
  }, []);

  const connect = useCallback(async (agentId: string) => {
    if (!apiKey) {
      console.error('🔑 [WebSocket] API key is required');
      setError('API key is required');
      return;
    }

    try {
      console.log(`🔌 [WebSocket] Connecting to agent: ${agentId}`);
      console.log(`🔑 [WebSocket] Using API key: ${apiKey.substring(0, 10)}...`);
      
      setConnectionState('connecting');
      setError(null);

      const wsUrl = `${WEBSOCKET_URL}?agent_id=${agentId}&xi_api_key=${apiKey}`;
      console.log(`🔗 [WebSocket] WebSocket URL: ${wsUrl.replace(apiKey, '***HIDDEN***')}`);
      
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('✅ [WebSocket] Connection opened successfully');
        
        // Send conversation initiation - simpler format
        const initMessage = {
          type: "conversation_initiation_client_data"
        };
        console.log('📤 [WebSocket] Sending init message:', initMessage);
        websocket.send(JSON.stringify(initMessage));

        // Add connection message
        setMessages(prev => [...prev, {
          type: 'conversation_initiation',
          data: { agent_id: agentId },
          timestamp: Date.now()
        }]);
      };

      websocket.onmessage = async (event) => {
        try {
          console.log('📥 [WebSocket] Received message:', event.data);
          
          if (event.data instanceof Blob) {
            // Handle binary audio data
            console.log('🎵 [WebSocket] Received audio data, size:', event.data.size);
            const audioData = await event.data.arrayBuffer();
            
            setMessages(prev => [...prev, {
              type: 'agent_response',
              audio: audioData,
              timestamp: Date.now()
            }]);

            // Play the audio response
            console.log('🔊 [WebSocket] Playing audio response');
            await playAudioResponse(audioData);
          } else {
            // Handle JSON messages
            const message = JSON.parse(event.data);
            console.log('📝 [WebSocket] Received JSON message:', message);
            
            if (message.type === 'agent_transcript') {
              console.log('🤖 [WebSocket] Agent transcript:', message.transcript);
              setMessages(prev => [...prev, {
                type: 'agent_transcript',
                transcript: message.transcript,
                timestamp: Date.now()
              }]);
            } else if (message.type === 'user_transcript') {
              console.log('👤 [WebSocket] User transcript:', message.transcript);
              setMessages(prev => [...prev, {
                type: 'user_transcript',
                transcript: message.transcript,
                timestamp: Date.now()
              }]);
            } else if (message.type === 'conversation_initiation_metadata') {
              console.log('🎯 [WebSocket] Conversation initiated successfully:', message);
              // Use setTimeout to ensure state update happens after current execution
              setTimeout(() => {
                setConnectionState('connected');
                console.log('✅ [WebSocket] Connection state updated to connected');
              }, 100);
            } else if (message.type === 'agent_response') {
              console.log('🗣️ [WebSocket] Agent response text:', message.agent_response_event?.agent_response);
              setMessages(prev => [...prev, {
                type: 'agent_transcript',
                transcript: message.agent_response_event?.agent_response || '',
                timestamp: Date.now()
              }]);
            } else if (message.type === 'audio') {
              console.log('🎵 [WebSocket] Received audio event with base64 data');
              
              if (message.audio_event?.audio_base_64) {
                try {
                  // Decode base64 audio data
                  const binaryString = atob(message.audio_event.audio_base_64);
                  const audioData = new ArrayBuffer(binaryString.length);
                  const view = new Uint8Array(audioData);
                  
                  for (let i = 0; i < binaryString.length; i++) {
                    view[i] = binaryString.charCodeAt(i);
                  }
                  
                  console.log('🔊 [WebSocket] Decoded base64 audio, playing...');
                  await playAudioResponse(audioData);
                  
                  setMessages(prev => [...prev, {
                    type: 'agent_response',
                    audio: audioData,
                    timestamp: Date.now()
                  }]);
                } catch (error) {
                  console.error('❌ [WebSocket] Error decoding base64 audio:', error);
                }
              }
            } else if (message.type === 'ping') {
              console.log('🏓 [WebSocket] Ping received:', message.ping_event?.event_id);
            } else {
              console.log('📋 [WebSocket] Other message type:', message.type, message);
            }
          }
        } catch (error) {
          console.error('❌ [WebSocket] Error processing message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('❌ [WebSocket] Connection error:', error);
        setError('WebSocket connection error');
        setConnectionState('error');
      };

      websocket.onclose = (event) => {
        console.log(`🔌 [WebSocket] Connection closed - Code: ${event.code}, Reason: ${event.reason}`);
        setConnectionState('disconnected');
        
        if (event.code !== 1000) {
          const errorMsg = `Connection closed unexpectedly: ${event.reason || 'Unknown reason'} (Code: ${event.code})`;
          console.error(`❌ [WebSocket] ${errorMsg}`);
          setError(errorMsg);
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

  const sendAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    if (websocketRef.current && connectionState === 'connected') {
      console.log(`🎤 [WebSocket] Sending PCM audio chunk, size: ${audioData.byteLength} bytes`);
      
      try {
        // Validate audio data
        if (!audioData || audioData.byteLength === 0) {
          console.warn('⚠️ [WebSocket] Skipping empty audio chunk');
          return;
        }

        // Audio is already in PCM format from our recorder, just encode to base64
        const uint8Array = new Uint8Array(audioData);
        const base64Audio = btoa(String.fromCharCode(...uint8Array));
        
        const audioMessage = {
          type: "user_audio_chunk",
          audio_data: base64Audio
        };
        
        console.log(`📤 [WebSocket] Sending audio message (${base64Audio.length} chars base64)`);
        websocketRef.current.send(JSON.stringify(audioMessage));

        setMessages(prev => [...prev, {
          type: 'user_audio_chunk',
          audio: audioData,
          timestamp: Date.now()
        }]);
      } catch (error) {
        console.error('❌ [WebSocket] Error sending audio:', error);
      }
    } else {
      console.warn(`⚠️ [WebSocket] Cannot send audio - State: ${connectionState}, WebSocket: ${websocketRef.current ? 'exists' : 'null'}`);
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