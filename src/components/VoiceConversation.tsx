'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePCMAudioRecorder } from '@/hooks/usePCMAudioRecorder';
import { useElevenLabsWebSocket } from '@/hooks/useElevenLabsWebSocket';
import VoiceVisualizer from './VoiceVisualizer';
import DebugPanel from './DebugPanel';
import ConnectionTest from './ConnectionTest';
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
  } = usePCMAudioRecorder(sendAudioChunk, {
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
    connectionCheck: () => connectionState === 'connected'
  });

  const api = createElevenLabsAPI(apiKey);

  // Load agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      if (!apiKey) {
        console.warn('⚠️ [VoiceConversation] No API key provided');
        return;
      }
      
      console.log('🔄 [VoiceConversation] Loading agents...');
      setLoadingAgents(true);
      try {
        const agentList = await api.getAgents();
        console.log(`✅ [VoiceConversation] Loaded ${agentList.length} agents:`, agentList);
        setAgents(agentList);
        
        // Keep the default agent if it exists in the list, otherwise use first available
        const defaultAgentExists = agentList.some(agent => agent.agent_id === defaultAgentId);
        console.log(`🎯 [VoiceConversation] Default agent ${defaultAgentId} exists: ${defaultAgentExists}`);
        
        if (!defaultAgentExists && agentList.length > 0) {
          console.log(`🔄 [VoiceConversation] Default agent not found, using first available: ${agentList[0].agent_id}`);
          setSelectedAgent(agentList[0].agent_id);
        } else {
          console.log(`✅ [VoiceConversation] Using default agent: ${defaultAgentId}`);
        }
      } catch (error) {
        console.error('❌ [VoiceConversation] Failed to load agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };

    loadAgents();
  }, [apiKey, defaultAgentId]);

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
      console.error('❌ [VoiceConversation] No agent selected');
      alert('Please select an agent first');
      return;
    }

    console.log(`🚀 [VoiceConversation] Starting conversation with agent: ${selectedAgent}`);
    
    try {
      console.log('🔌 [VoiceConversation] Connecting to WebSocket...');
      await connect(selectedAgent);
      
      // Wait for connection to fully establish and agent to be ready
      console.log('⏳ [VoiceConversation] Waiting for agent to be ready...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🎤 [VoiceConversation] Initializing audio recorder...');
      await initializeRecorder();
      
      if (!isPushToTalk) {
        console.log('📻 [VoiceConversation] Starting continuous listening mode...');
        setIsListening(true);
        await startRecording();
      } else {
        console.log('🎙️ [VoiceConversation] Push-to-talk mode ready');
      }
      
      console.log('✅ [VoiceConversation] Conversation started successfully');
    } catch (error) {
      console.error('❌ [VoiceConversation] Failed to start conversation:', error);
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
      {/* Connection Test */}
      <div className="p-6 border-b border-gray-200">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Connection Status</h3>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionState === 'connected' ? 'bg-green-400 animate-pulse' :
                connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                connectionState === 'error' ? 'bg-red-400' :
                'bg-gray-400'
              }`}></div>
              <span className="text-sm text-gray-600">
                WebSocket: {connectionState}
              </span>
            </div>
            
            <div className="text-sm text-gray-600">
              Messages: {messages.length}
            </div>
            
            <div className="text-sm text-gray-600">
              Agent: {selectedAgent ? selectedAgent.substring(0, 20) + '...' : 'None'}
            </div>
          </div>

          {messages.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-green-800 text-sm">
                ✅ Connection working! Received {messages.length} messages from server.
              </p>
            </div>
          )}
          
          {connectionState === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-800 text-sm">
                ❌ Connection error. Check console for details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Voice Conversation</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isConnected ? 'Connected and ready to chat' : 'Select an agent to start a voice conversation'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === 'connected' ? 'bg-green-400 animate-pulse' :
              connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              connectionState === 'error' ? 'bg-red-400' :
              'bg-gray-400'
            }`}></div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              connectionState === 'connected' ? 'bg-green-100 text-green-800' :
              connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              connectionState === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionState === 'connected' ? 'Ready to Chat' :
               connectionState === 'connecting' ? 'Connecting...' :
               connectionState === 'error' ? 'Connection Error' :
               'Disconnected'}
            </div>
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
            <>
              <button
                onClick={handleStartConversation}
                disabled={!selectedAgent || connectionState === 'connecting'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {connectionState === 'connecting' ? 'Connecting...' : 'Start Conversation'}
              </button>
              
              {selectedAgent && (
                <button
                  onClick={async () => {
                    console.log('🧪 [Test] Starting connection-only test...');
                    try {
                      await connect(selectedAgent);
                      console.log('🧪 [Test] Connection initiated, waiting for confirmation...');
                    } catch (error) {
                      console.error('🧪 [Test] Connection failed:', error);
                    }
                  }}
                  disabled={connectionState === 'connecting'}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  Test Connection Only
                </button>
              )}
            </>
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
                  <p className="text-xs text-gray-600">
                    {connectionState !== 'connected' ? 'Waiting for connection...' : 'Hold the button while speaking'}
                  </p>
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
                    {connectionState !== 'connected' ? 'Waiting for connection...' :
                     isListening ? 'Continuously listening...' : 'Click to start listening'}
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

      {/* Debug Panel */}
      <DebugPanel
        apiKey={apiKey}
        selectedAgent={selectedAgent}
        connectionState={connectionState}
        isRecording={isRecording}
        audioLevel={audioLevel}
        agentCount={agents.length}
        messageCount={messages.length}
        transcriptCount={transcriptMessages.length}
        error={wsError || recorderError}
      />
    </div>
  );
}