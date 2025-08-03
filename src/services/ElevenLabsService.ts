interface ConversationConfig {
  agent: {
    prompt: {
      prompt: string;
    };
    first_message: string;
    language: string;
  };
  asr: {
    quality: string;
    user_input_audio_format: string;
  };
  tts: {
    quality: string;
    output_audio_format: string;
  };
  turn_detection: {
    type: string;
    enabled: boolean;
    sensitivity: number;
    timeout_ms: number;
  };
}

interface KnowledgeBase {
  type: string;
  name: string;
  id: string;
  usage_mode: string;
  text: string;
}

interface CreateAgentRequest {
  conversation_config: ConversationConfig;
  knowledge_base: KnowledgeBase[];
}

interface AudioMessage {
  user_audio_chunk: string;
}

interface EmergencyMessage {
  type: 'user' | 'agent';
  text: string;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl: string;
  private websocket: WebSocket | null;
  private agentId: string | null;
  private conversationId: string | null;
  private listeners: Map<string, Function[]>;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
    this.baseUrl = "https://api.elevenlabs.io";
    this.websocket = null;
    this.agentId = null;
    this.conversationId = null;
    this.listeners = new Map();

    if (!this.apiKey) {
      console.warn(
        "ElevenLabs API key not found. Please set NEXT_PUBLIC_ELEVENLABS_API_KEY in your .env file."
      );
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  async createAgent(prompt: string, accidentReport: string, emergencyType: string): Promise<string> {
    try {
      console.log("Creating agent with prompt:", prompt);

      // Create direct first messages that provide information immediately
      const firstMessages: Record<string, string> = {
        police: `Hello, I'm reporting a bike accident from DashMap.`,
        ambulance: `Hello, I'm calling about a bike accident from DashMap.`,
        family: `Hi, I'm calling to inform you about a bike accident from DashMap.`,
      };

      const enhancedPrompt = `${prompt}

BIKE ACCIDENT INCIDENT REPORT:
${accidentReport}

INFORMATION FOR DIFFERENT RESPONDERS:

POLICE INFORMATION:
- Incident Location: [Extract/ask about specific address, intersection, landmarks]
- Time of Incident: [Extract/ask about exact time and date]  
- People Involved: [Extract/ask about cyclist and any other parties]
- Property Damage: [Extract/ask about bike damage, vehicle damage, property damage]
- Traffic Impact: [Extract/ask about road blockage, traffic issues]
- Witnesses: [Extract/ask about witness information]
- Law Enforcement Needs: [Assess if traffic control, investigation, or citations needed]

MEDICAL INFORMATION:
- Injuries Sustained: [Extract/ask about specific injuries, pain level, bleeding]
- Consciousness Level: [Extract/ask if person is alert, responsive, confused]
- Mobility Status: [Extract/ask if person can move, walk, stand]
- Pain Assessment: [Extract/ask about pain location and severity]
- Immediate Medical Needs: [Assess urgency level - critical, urgent, or minor]
- Current Condition: [Extract current status and any changes]

FAMILY/PERSONAL INFORMATION:
- Safety Status: [Reassuring information about person's wellbeing]
- Current Situation: [Where person is now, who is helping]
- Next Steps: [What will happen next, hospital visits, etc.]
- Support Needed: [What family can do to help]
- Contact Information: [How to reach the person or get updates]

INSURANCE INFORMATION:
- Incident Details: [Factual description of what occurred]
- Property Damage: [Detailed bike and equipment damage]
- Third Party Involvement: [Other vehicles, property, or people involved]
- Documentation: [Photos taken, police report numbers, witness info]
- Medical Treatment: [Any medical attention received]

IMPORTANT INSTRUCTIONS:
- When asked for information, provide direct answers immediately
- If asked for "everything", "summary", or "details", give complete relevant information for your role
- Do NOT ask follow-up questions unless absolutely critical information is missing
- Be informative and direct in your responses
- Provide answers based on this incident report without asking what specific details they want`;

      const requestBody: CreateAgentRequest = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: enhancedPrompt,
            },
            first_message:
              firstMessages[emergencyType] || firstMessages.police,
            language: "en",
          },
          asr: {
            quality: "high",
            user_input_audio_format: "pcm_16000",
          },
          tts: {
            quality: "high",
            output_audio_format: "pcm_16000",
          },
          turn_detection: {
            type: "server_vad",
            enabled: true,
            sensitivity: 0.7,
            timeout_ms: 2000,
          },
        },
        knowledge_base: [],
      };

      const response = await fetch(`${this.baseUrl}/v1/convai/agents/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create agent: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      this.agentId = data.agent_id;
      console.log("Agent created successfully:", this.agentId);
      return this.agentId || '';
    } catch (error) {
      console.error("Error creating agent:", error);
      throw error;
    }
  }

  async startConversation({
    prompt,
    accidentReport,
    audioManager,
    emergencyType,
  }: {
    prompt: string;
    accidentReport: string;
    audioManager: any;
    emergencyType: string;
  }): Promise<void> {
    try {
      // Clean up any existing connection first
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Create the agent first
      await this.createAgent(prompt, accidentReport, emergencyType);

      // Start the WebSocket conversation
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}&xi-api-key=${this.apiKey}`;

      console.log("Connecting to WebSocket:", wsUrl);
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log("WebSocket connected");

        this.emit("connectionChange", true);

        // Start audio streaming from microphone with a small delay to ensure connection is stable
        setTimeout(() => {
          audioManager.startRecording((audioData: ArrayBuffer) => {
            if (
              this.websocket &&
              this.websocket.readyState === WebSocket.OPEN
            ) {
              // Send audio data in the format ElevenLabs expects
              const audioMessage: AudioMessage = {
                user_audio_chunk: this.arrayBufferToBase64(audioData),
              };
              console.log("Sending audio chunk...");
              this.websocket.send(JSON.stringify(audioMessage));
            }
          });
        }, 1000);
      };

      this.websocket.onmessage = async (event) => {
        try {
          // All messages should be JSON
          const data = JSON.parse(event.data);
          console.log("WebSocket message:", data);

          // Handle messages based on exact ElevenLabs format
          if (data.type === "conversation_initiation_metadata") {
            this.conversationId =
              data.conversation_initiation_metadata_event?.conversation_id;
            console.log("Conversation ID:", this.conversationId);
          } else if (data.type === "audio") {
            // Play audio response from agent
            if (data.audio_event?.audio_base_64) {
              await audioManager.playAudio(data.audio_event.audio_base_64);
            }
          } else if (data.type === "user_transcript") {
            // User speech was transcribed
            if (data.user_transcription_event?.user_transcript) {
              this.emit("message", {
                type: "user",
                text: data.user_transcription_event.user_transcript,
              });
            }
          } else if (data.type === "agent_response") {
            // Agent response text
            if (data.agent_response_event?.agent_response) {
              this.emit("message", {
                type: "agent",
                text: data.agent_response_event.agent_response,
              });
            }
          } else if (data.type === "ping") {
            // Respond to ping with pong (exact format from docs)
            this.websocket!.send(
              JSON.stringify({
                type: "pong",
                event_id: data.ping_event.event_id,
              })
            );
          } else if (data.type === "interruption") {
            // Handle interruption - user started speaking while agent was talking
            console.log("User interrupted agent:", data.interruption_event);
            // Agent will automatically stop and listen for user input
          } else if (data.type === "vad_score") {
            // Voice activity detection score - can be used for UI feedback
            console.log(
              "Voice activity detected:",
              data.vad_score_event?.vad_score
            );
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          console.log("Raw message:", event.data);
        }
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.emit("error", "Connection error occurred");
      };

      this.websocket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        this.emit("connectionChange", false);
        audioManager.stopRecording();
      };
    } catch (error) {
      console.error("Error starting conversation:", error);
      this.emit("error", (error as Error).message);
      throw error;
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.agentId = null;
    this.conversationId = null;
    this.emit("connectionChange", false);
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default ElevenLabsService;