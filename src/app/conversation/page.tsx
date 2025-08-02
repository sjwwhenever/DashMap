'use client';

import React, { useState } from 'react';
import ConversationList from '@/components/ConversationList';
import ConversationChat from '@/components/ConversationChat';
import { Conversation } from '@/types/elevenlabs';
import { getElevenLabsAPIKey } from '@/lib/elevenlabs-api';

export default function ConversationPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>();
  const [showApiInfo, setShowApiInfo] = useState(false);
  
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Upload
              </a>
              <h1 className="text-xl font-semibold text-gray-900">
                ElevenLabs Conversations
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowApiInfo(!showApiInfo)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                API Info
              </button>
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                elevenlabs.io →
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* API Information Panel */}
      {showApiInfo && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                ElevenLabs API Configuration
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Environment Variables</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_ELEVENLABS_API_KEY</code></li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">ELEVENLABS_API_KEY</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Current Configuration</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>API URL: https://api.elevenlabs.io/v1</li>
                    <li>API Key: {apiKey ? '••••••••' : 'Not configured'}</li>
                    <li>Conversations Endpoint: /convai/conversations</li>
                    <li>Agents Endpoint: /convai/agents</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Add <code>NEXT_PUBLIC_ELEVENLABS_API_KEY</code> to your <code>.env.local</code> file to connect to the ElevenLabs API.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex h-[calc(100vh-4rem)]">
        <ConversationList
          apiKey={apiKey}
          onConversationSelect={handleConversationSelect}
          selectedConversationId={selectedConversation?.conversation_id}
        />
        <ConversationChat
          conversation={selectedConversation}
          apiKey={apiKey}
        />
      </main>
    </div>
  );
}