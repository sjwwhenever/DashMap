'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Conversation, ChatMessage } from '@/types/elevenlabs';
import VoiceConversation from './VoiceConversation';

interface ConversationChatProps {
  conversation?: Conversation;
  apiKey: string;
}

export default function ConversationChat({ conversation, apiKey }: ConversationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversation) {
      setMessages([]);
      setError(null);
      setIsConnected(false);
      
      if (conversation.transcript_summary) {
        setMessages([{
          id: 'summary',
          role: 'assistant',
          content: `Previous conversation summary: ${conversation.transcript_summary}`,
          timestamp: Date.now()
        }]);
      }
    }
  }, [conversation]);

  const handleStartNewConversation = async () => {
    if (!apiKey || !conversation) {
      setError('API key or conversation not available');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      setIsConnected(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Connected to ${conversation.agent_name}. You can start chatting!`,
        timestamp: Date.now()
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `This is a demo response to: "${userMessage.content}". In a real implementation, this would connect to the ElevenLabs Conversational AI API to get actual responses.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a Voice Conversation</h3>
            <p className="text-sm text-gray-600 mb-6">Experience real-time voice conversations with ElevenLabs AI agents</p>
          </div>
        </div>
        
        <div className="p-6">
          <VoiceConversation apiKey={apiKey} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {conversation.call_summary_title || conversation.agent_name}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
              <span>Agent: {conversation.agent_name}</span>
              <span>Duration: {Math.floor(conversation.call_duration_secs / 60)}:{(conversation.call_duration_secs % 60).toString().padStart(2, '0')}</span>
              <span>Messages: {conversation.message_count}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                conversation.call_successful === 'success' ? 'bg-green-100 text-green-800' :
                conversation.call_successful === 'failure' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {conversation.call_successful}
              </span>
            </div>
          </div>
          
          {!isConnected && (
            <button
              onClick={handleStartNewConversation}
              disabled={isConnecting || !apiKey}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              {isConnecting ? 'Connecting...' : 'Start New Chat'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isConnected && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}

      {!isConnected && !error && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-center text-gray-600 text-sm">
            {!apiKey ? 'API key not configured' : 'Click "Start New Chat" to begin a conversation with this agent'}
          </p>
        </div>
      )}
    </div>
  );
}