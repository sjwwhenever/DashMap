'use client';

import React, { useState } from 'react';
import { ConnectionState } from '@/hooks/useElevenLabsWebSocket';

interface DebugPanelProps {
  apiKey: string;
  selectedAgent: string;
  connectionState: ConnectionState;
  isRecording: boolean;
  audioLevel: number;
  agentCount: number;
  messageCount: number;
  transcriptCount: number;
  error: string | null;
}

export default function DebugPanel({
  apiKey,
  selectedAgent,
  connectionState,
  isRecording,
  audioLevel,
  agentCount,
  messageCount,
  transcriptCount,
  error
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const debugInfo = [
    { label: 'API Key', value: apiKey ? `${apiKey.substring(0, 10)}...` : 'Not set', status: apiKey ? 'good' : 'error' },
    { label: 'Selected Agent', value: selectedAgent || 'None', status: selectedAgent ? 'good' : 'warning' },
    { label: 'Connection State', value: connectionState, status: connectionState === 'connected' ? 'good' : connectionState === 'error' ? 'error' : 'warning' },
    { label: 'Audio Recording', value: isRecording ? 'Active' : 'Inactive', status: isRecording ? 'good' : 'neutral' },
    { label: 'Audio Level', value: `${Math.round(audioLevel * 100)}%`, status: 'neutral' },
    { label: 'Agents Loaded', value: agentCount.toString(), status: agentCount > 0 ? 'good' : 'warning' },
    { label: 'WebSocket Messages', value: messageCount.toString(), status: 'neutral' },
    { label: 'Transcript Messages', value: transcriptCount.toString(), status: 'neutral' },
    { label: 'Last Error', value: error || 'None', status: error ? 'error' : 'good' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          🐛 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-w-md w-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Debug Panel</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {debugInfo.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 min-w-0 flex-1">
                {item.label}:
              </span>
              <span className={`text-xs px-2 py-1 rounded text-right max-w-xs truncate ${getStatusColor(item.status)}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <button
              onClick={() => console.clear()}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
            >
              Clear Console Logs
            </button>
            <button
              onClick={() => {
                console.log('🔍 [Debug] Current state:', {
                  apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'Not set',
                  selectedAgent,
                  connectionState,
                  isRecording,
                  audioLevel,
                  agentCount,
                  messageCount,
                  transcriptCount,
                  error,
                  timestamp: new Date().toISOString()
                });
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
            >
              Log Current State
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Check the browser console (F12) for detailed logs with emojis for easy identification.
          </p>
        </div>
      </div>
    </div>
  );
}