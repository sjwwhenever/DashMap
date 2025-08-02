export interface Conversation {
  agent_id: string;
  conversation_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status: string;
  call_successful: 'success' | 'failure' | 'unknown';
  agent_name: string;
  transcript_summary?: string;
  call_summary_title?: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ConversationFilters {
  cursor?: string;
  agent_id?: string;
  call_successful?: 'success' | 'failure' | 'unknown';
  call_start_before_unix?: number;
  call_start_after_unix?: number;
  user_id?: string;
  page_size?: number;
  summary_mode?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Agent {
  agent_id: string;
  name: string;
  description?: string;
}