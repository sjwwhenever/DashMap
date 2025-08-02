import { ConversationsResponse, ConversationFilters, Agent } from '@/types/elevenlabs';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

class ElevenLabsAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${ELEVENLABS_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
      const response = await this.makeRequest<{ agents: Agent[] }>('/convai/agents');
      return response.agents || [];
    } catch (error) {
      console.error('Failed to fetch agents:', error);
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