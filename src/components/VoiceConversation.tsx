'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useElevenLabsWebSocket } from '@/hooks/useElevenLabsWebSocket';
import VoiceVisualizer from './VoiceVisualizer';
import { Agent } from '@/types/elevenlabs';
import { createElevenLabsAPI } from '@/lib/elevenlabs-api';

interface VoiceConversationProps {
  apiKey: string;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export default function VoiceConversation({ apiKey }: VoiceConversationProps) {
  const defaultAgentId = process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID || 'agent_6801k1n9q1wae3ys563vw28geswj';
  const [selectedAgent, setSelectedAgent] = useState<string>(defaultAgentId);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    connectionState,
    messages,
    error: wsError,
    connect,
    disconnect,
    sendAudioChunk,
    clearMessages
  } = useElevenLabsWebSocket(apiKey);

  const {
    isRecording,
    isInitialized,
    error: recorderError,
    audioLevel,
    startRecording,
    stopRecording,
    initializeRecorder,
    cleanup
  } = useAudioRecorder(sendAudioChunk, {
    sampleRate: 44100,
    echoCancellation: true,
    noiseSuppression: true
  });

  const api = createElevenLabsAPI(apiKey);

  // Load agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      if (!apiKey) return;
      
      setLoadingAgents(true);
      try {
        const agentList = await api.getAgents();
        setAgents(agentList);
        // Keep the default agent if it exists in the list, otherwise use first available
        const defaultAgentExists = agentList.some(agent => agent.agent_id === defaultAgentId);
        if (!defaultAgentExists && agentList.length > 0) {
          setSelectedAgent(agentList[0].agent_id);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };

    loadAgents();
  }, [apiKey]);

  // Process WebSocket messages for transcripts
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    if (latestMessage.type === 'user_transcript' && latestMessage.transcript) {
      setTranscriptMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: 'user',
        text: latestMessage.transcript!,
        timestamp: latestMessage.timestamp
      }]);
    } else if (latestMessage.type === 'agent_transcript' && latestMessage.transcript) {
      setTranscriptMessages(prev => [...prev, {
        id: `agent-${Date.now()}`,
        role: 'agent',
        text: latestMessage.transcript!,
        timestamp: latestMessage.timestamp
      }]);
    }
  }, [messages]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptMessages]);

  const handleStartConversation = async () => {
    if (!selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    try {
      await initializeRecorder();
      await connect(selectedAgent);
      
      if (!isPushToTalk) {
        setIsListening(true);
        await startRecording();
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleEndConversation = () => {
    setIsListening(false);
    stopRecording();
    disconnect();
    cleanup();
  };

  const handlePushToTalkPress = async () => {
    if (connectionState !== 'connected') return;
    
    if (!isRecording) {
      setIsListening(true);
      await startRecording();
    }
  };

  const handlePushToTalkRelease = () => {
    if (isRecording) {
      setIsListening(false);
      stopRecording();
    }
  };

  const handleToggleContinuousListening = async () => {
    if (connectionState !== 'connected') return;

    if (isListening) {
      setIsListening(false);
      stopRecording();
    } else {
      setIsListening(true);
      await startRecording();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const isConnected = connectionState === 'connected';
  const hasError = wsError || recorderError;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">API Key Required</p>
          <p className="text-sm">Please configure your ElevenLabs API key in the environment settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Voice Conversation</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isConnected ? 'Connected and ready to chat' : 'Select an agent to start a voice conversation'}
            </p>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            connectionState === 'connected' ? 'bg-green-100 text-green-800' :
            connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            connectionState === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
          </div>
        </div>

        {/* Agent Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Agent
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            disabled={isConnected || loadingAgents}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {loadingAgents ? (
              <option>Loading agents...</option>
            ) : agents.length === 0 ? (
              <option>No agents available</option>
            ) : (
              <>
                <option value="">Choose an agent...</option>
                {agents.map(agent => (
                  <option key={agent.agent_id} value={agent.agent_id}>
                    {agent.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Error Display */}
        {hasError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{wsError || recorderError}</p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-3">
          {!isConnected ? (
            <button
              onClick={handleStartConversation}
              disabled={!selectedAgent || connectionState === 'connecting'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {connectionState === 'connecting' ? 'Connecting...' : 'Start Conversation'}
            </button>
          ) : (
            <button
              onClick={handleEndConversation}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              End Conversation
            </button>
          )}

          {isConnected && (
            <>
              <button
                onClick={() => setIsPushToTalk(!isPushToTalk)}
                className={`px-4 py-2 rounded-md text-sm ${
                  isPushToTalk ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isPushToTalk ? 'Push-to-Talk Mode' : 'Continuous Mode'}
              </button>

              <button
                onClick={() => {
                  clearMessages();
                  setTranscriptMessages([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Clear Transcript
              </button>
            </>
          )}
        </div>
      </div>

      {/* Voice Visualizer */}
      {isConnected && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="text-center">
            <VoiceVisualizer
              audioLevel={audioLevel}
              isActive={isListening}
              size="large"
              color="#3B82F6"
            />
            
            <div className="mt-4 space-y-2">
              {isPushToTalk ? (
                <div className="space-y-2">
                  <button
                    onMouseDown={handlePushToTalkPress}
                    onMouseUp={handlePushToTalkRelease}
                    onTouchStart={handlePushToTalkPress}
                    onTouchEnd={handlePushToTalkRelease}
                    className={`px-6 py-3 rounded-full font-medium ${
                      isListening 
                        ? 'bg-red-500 text-white' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isListening ? 'Release to Stop' : 'Hold to Speak'}
                  </button>
                  <p className="text-xs text-gray-600">Hold the button while speaking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleToggleContinuousListening}
                    className={`px-6 py-3 rounded-full font-medium ${
                      isListening 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {isListening ? 'Stop Listening' : 'Start Listening'}
                  </button>
                  <p className="text-xs text-gray-600">
                    {isListening ? 'Continuously listening...' : 'Click to start listening'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Transcript</h3>
        
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {transcriptMessages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {isConnected ? 'Start speaking to see the transcript...' : 'Connect to an agent to begin'}
            </p>
          ) : (
            <div className="space-y-3">
              {transcriptMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-medium ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.role === 'user' ? 'You' : 'Agent'}
                      </span>
                      <span className={`text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}