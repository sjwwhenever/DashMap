import { ConversationsResponse, ConversationFilters, Agent } from '@/types/elevenlabs';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

class ElevenLabsAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${ELEVENLABS_API_BASE}${endpoint}`;
    
    console.log(`🔗 [ElevenLabs API] Making request to: ${url}`);
    console.log(`🔑 [ElevenLabs API] Using API key: ${this.apiKey.substring(0, 10)}...`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`📡 [ElevenLabs API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [ElevenLabs API] Error response:`, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [ElevenLabs API] Success response:`, data);
    return data;
  }

  async getConversations(filters: ConversationFilters = {}): Promise<ConversationsResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/convai/conversations${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<ConversationsResponse>(endpoint);
  }

  async getAgents(): Promise<Agent[]> {
    try {
      console.log(`🤖 [ElevenLabs API] Fetching agents...`);
      const response = await this.makeRequest<{ agents: Agent[] }>('/convai/agents');
      console.log(`🤖 [ElevenLabs API] Found ${response.agents?.length || 0} agents:`, response.agents);
      return response.agents || [];
    } catch (error) {
      console.error('❌ [ElevenLabs API] Failed to fetch agents:', error);
      return [];
    }
  }
}

export const createElevenLabsAPI = (apiKey: string) => new ElevenLabsAPI(apiKey);

export const getElevenLabsAPIKey = (): string => {
  if (typeof window !== 'undefined') {
    return '';
  }
  
  return process.env.ELEVENLABS_API_KEY || '';
};