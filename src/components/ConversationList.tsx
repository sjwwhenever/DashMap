'use client';

import React, { useState, useEffect } from 'react';
import { Conversation, ConversationFilters, Agent } from '@/types/elevenlabs';
import { createElevenLabsAPI } from '@/lib/elevenlabs-api';

interface ConversationListProps {
  apiKey: string;
  onConversationSelect: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export default function ConversationList({ 
  apiKey, 
  onConversationSelect, 
  selectedConversationId 
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({ page_size: 20 });
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const api = createElevenLabsAPI(apiKey);

  const loadConversations = async (reset = false) => {
    if (!apiKey) {
      setError('API key not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentFilters = reset ? { ...filters, cursor: undefined } : filters;
      const response = await api.getConversations(currentFilters);
      
      if (reset) {
        setConversations(response.conversations);
      } else {
        setConversations(prev => [...prev, ...response.conversations]);
      }
      
      setHasMore(response.has_more);
      setNextCursor(response.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    if (!apiKey) return;
    
    try {
      const agentList = await api.getAgents();
      setAgents(agentList);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  useEffect(() => {
    loadConversations(true);
    loadAgents();
  }, [apiKey, filters.agent_id, filters.call_successful]);

  const handleLoadMore = () => {
    if (hasMore && nextCursor) {
      setFilters(prev => ({ ...prev, cursor: nextCursor }));
      loadConversations(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (unixSecs: number) => {
    return new Date(unixSecs * 1000).toLocaleDateString();
  };

  if (!apiKey) {
    return (
      <div className="w-1/3 bg-white border-r border-gray-200 p-4">
        <div className="text-center text-gray-500">
          <p>API key not configured</p>
          <p className="text-sm mt-2">Set ELEVENLABS_API_KEY in your environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversations</h2>
        
        {/* Filters */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent
            </label>
            <select
              value={filters.agent_id || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                agent_id: e.target.value || undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All agents</option>
              {agents.map(agent => (
                <option key={agent.agent_id} value={agent.agent_id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.call_successful || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                call_successful: e.target.value as any || undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Loading conversations...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            <p>{error}</p>
            <button 
              onClick={() => loadConversations(true)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No conversations found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                onClick={() => onConversationSelect(conversation)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedConversationId === conversation.conversation_id 
                    ? 'bg-blue-50 border-r-2 border-blue-500' 
                    : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {conversation.call_summary_title || conversation.agent_name}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    conversation.call_successful === 'success' ? 'bg-green-100 text-green-800' :
                    conversation.call_successful === 'failure' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {conversation.call_successful}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p>{formatDate(conversation.start_time_unix_secs)}</p>
                  <p>Duration: {formatDuration(conversation.call_duration_secs)}</p>
                  <p>Messages: {conversation.message_count}</p>
                </div>
                
                {conversation.transcript_summary && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {conversation.transcript_summary}
                  </p>
                )}
              </div>
            ))}
            
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}