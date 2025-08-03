'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ElevenLabsService from '@/services/ElevenLabsService';
import AudioManager from '@/utils/AudioManager';

const EMERGENCY_TYPES = {
  police: {
    label: "Call Police",
    emoji: "🚔",
    className: "police-button",
    prompt:
      "You are calling the police to report a bike accident. When the user asks for information, provide direct answers from the knowledge base. Do NOT ask questions back - just give the information requested. If they ask for 'everything' or 'summary' or 'details', provide a complete summary of all police-relevant information: location, time, what happened, people involved, property damage, and law enforcement needs. Be informative and direct. Only mention if critical information is missing, don't ask follow-up questions. Keep responses professional and factual.",
  },
  ambulance: {
    label: "Call Ambulance",
    emoji: "🚑",
    className: "ambulance-button",
    prompt:
      "You are calling emergency medical services about a bike accident. When the user asks for information, provide direct answers from the knowledge base. Do NOT ask questions back - just give the medical information. If they ask for 'everything' or 'summary' or 'details', provide a complete medical summary: injuries, consciousness level, bleeding, pain, mobility, and medical urgency. Be direct and informative. Only mention if critical medical information is missing, don't ask follow-up questions. Stay calm and focus on providing medical facts.",
  },
  family: {
    label: "Call Family",
    emoji: "👨‍👩‍👧‍👦",
    className: "family-button",
    prompt:
      "You are calling a family member about a bike accident. When the user asks for information, provide direct, caring answers from the knowledge base. Do NOT ask questions back - just share the information warmly. If they ask for 'everything' or 'summary' or 'details', provide a complete but reassuring summary: safety status, what happened, current condition, and next steps. Be informative and supportive. Only mention if you need to find out something important, don't ask unnecessary follow-up questions.",
  },
};

interface EmergencyMessage {
  type: 'user' | 'agent';
  text: string;
}

interface EmergencyResponseProps {
  accidentReport: string;
}

export default function EmergencyResponse({ accidentReport }: EmergencyResponseProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [currentCall, setCurrentCall] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmergencyMessage[]>([]);
  const [error, setError] = useState("");
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState("00:00");

  const elevenLabsService = useRef<ElevenLabsService | null>(null);
  const audioManager = useRef<AudioManager | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer management functions
  const startCallTimer = useCallback(() => {
    const startTime = Date.now();
    setCallStartTime(startTime);
    setIsConversationActive(true);
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallStartTime(null);
    setCallDuration("00:00");
    setIsConversationActive(false);
  }, []);

  useEffect(() => {
    // Initialize services
    elevenLabsService.current = new ElevenLabsService();
    audioManager.current = new AudioManager();

    // Set up event listeners
    const handleMessage = (message: EmergencyMessage) => {
      setMessages((prev) => [...prev, message]);
      
      // Start timer when first message is received (conversation becomes active)
      if (!isConversationActive && (message.type === 'user' || message.type === 'agent')) {
        startCallTimer();
      }
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setIsConnecting(false);
      } else {
        setIsConnecting(false);
        setCurrentCall(null);
        stopCallTimer();
      }
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
      setIsConnecting(false);
      setIsConnected(false);
      setCurrentCall(null);
      stopCallTimer();
    };

    elevenLabsService.current.on("message", handleMessage);
    elevenLabsService.current.on("connectionChange", handleConnectionChange);
    elevenLabsService.current.on("error", handleError);

    return () => {
      if (elevenLabsService.current) {
        elevenLabsService.current.disconnect();
      }
      if (audioManager.current) {
        audioManager.current.cleanup();
      }
      stopCallTimer();
    };
  }, [startCallTimer, stopCallTimer, isConversationActive]);

  const handleEmergencyCall = async (emergencyType: string) => {
    if (!accidentReport.trim()) {
      setError("Please complete video analysis before making a call.");
      return;
    }

    setError("");
    setIsConnecting(true);
    setCurrentCall(emergencyType);
    setMessages([]);

    try {
      // Request microphone permission
      await audioManager.current!.requestPermission();

      // Create conversation with ElevenLabs
      const config = EMERGENCY_TYPES[emergencyType as keyof typeof EMERGENCY_TYPES];
      await elevenLabsService.current!.startConversation({
        prompt: config.prompt,
        accidentReport: accidentReport.trim(),
        audioManager: audioManager.current,
        emergencyType: emergencyType,
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError(
        "Failed to start conversation. Please check your API key and try again."
      );
      setIsConnecting(false);
      setCurrentCall(null);
    }
  };

  const handleHangUp = () => {
    elevenLabsService.current!.disconnect();
    audioManager.current!.cleanup();
    setMessages([]);
    stopCallTimer();
    setError("");
  };

  const renderCallStatus = () => {
    if (isConnecting) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-blue-700 font-medium">
                Connecting to {EMERGENCY_TYPES[currentCall as keyof typeof EMERGENCY_TYPES]?.label}...
              </span>
            </div>
            <button
              onClick={handleHangUp}
              className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded font-medium text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (isConnected && currentCall) {
      const statusText = isConversationActive 
        ? `📞 Connected to ${EMERGENCY_TYPES[currentCall as keyof typeof EMERGENCY_TYPES]?.label} - ${callDuration}`
        : `Connected, starting conversation...`;
      
      const indicatorColor = isConversationActive ? "bg-green-400" : "bg-yellow-400";
      
      return (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 ${indicatorColor} rounded-full mr-2 animate-pulse`}></div>
              <span className="text-green-700 font-medium">
                {statusText}
              </span>
            </div>
            <button
              onClick={handleHangUp}
              className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded font-medium text-sm transition-colors"
            >
              Hang Up
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!accidentReport.trim()) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">Emergency Response</h3>
          <p className="text-xs text-gray-600">
            Upload and analyze a video first to enable emergency calling
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🚴‍♂️ Emergency Response
        </h3>
        <p className="text-sm text-gray-600">
          AI-powered emergency calls using your analysis results
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {renderCallStatus()}

      {!isConnected && !isConnecting && (
        <div className="space-y-3">
          {Object.entries(EMERGENCY_TYPES).map(([type, config]) => (
            <button
              key={type}
              className={`w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-all duration-200 ${
                type === 'police'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : type === 'ambulance'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95`}
              onClick={() => handleEmergencyCall(type)}
              disabled={isConnecting || isConnected || !accidentReport.trim()}
            >
              <span className="text-lg mr-2">{config.emoji}</span>
              {config.label}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Call Transcript</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-md text-sm ${
                  message.type === "user"
                    ? "bg-blue-50 border-l-4 border-blue-400"
                    : "bg-gray-50 border-l-4 border-gray-400"
                }`}
              >
                <div className="flex items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    {message.type === "user" ? "👤 You" : "🤖 Agent"}
                  </span>
                </div>
                <p className="text-gray-800">{message.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}