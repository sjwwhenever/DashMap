'use client';

import React, { useState } from 'react';
import { useElevenLabsWebSocket } from '@/hooks/useElevenLabsWebSocket';

interface ConnectionTestProps {
  apiKey: string;
  agentId: string;
}

export default function ConnectionTest({ apiKey, agentId }: ConnectionTestProps) {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { connectionState, connect, disconnect, messages } = useElevenLabsWebSocket(apiKey);

  const runConnectionTest = async () => {
    setIsTestRunning(true);
    setTestResults([]);
    
    const addResult = (message: string) => {
      setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
      console.log(`🧪 [Test] ${message}`);
    };

    try {
      addResult('Starting connection test...');
      addResult(`Connecting to agent: ${agentId}`);
      
      await connect(agentId);
      addResult('Connection initiated');
      
      // Listen for messages as a better indicator than state
      const initialMessageCount = messages.length;
      addResult('Waiting for server response...');
      
      let attempts = 0;
      let connected = false;
      
      while (!connected && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        
        // Check if we received any new messages (better indicator than state)
        if (messages.length > initialMessageCount) {
          connected = true;
          addResult('✅ Connection successful!');
          addResult(`Received ${messages.length - initialMessageCount} messages from server`);
          addResult('✅ Communication working!');
          break;
        }
        
        // Also check connection state as backup
        if (connectionState === 'connected') {
          connected = true;
          addResult('✅ Connection successful (state updated)!');
          break;
        }
        
        if (attempts % 2 === 0) {
          addResult(`Waiting for response... (${attempts}/20)`);
        }
      }
      
      if (!connected) {
        addResult('❌ Connection failed to establish');
        addResult(`Final state: ${connectionState}`);
        addResult(`Messages received: ${messages.length}`);
      }
      
    } catch (error) {
      addResult(`❌ Connection error: ${error}`);
    } finally {
      setTimeout(() => {
        setIsTestRunning(false);
        addResult('Test completed');
      }, 3000);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Connection Test</h3>
      
      <div className="flex items-center space-x-4 mb-4">
        <button
          onClick={runConnectionTest}
          disabled={isTestRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isTestRunning ? 'Testing...' : 'Test Connection'}
        </button>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionState === 'connected' ? 'bg-green-400' :
            connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            connectionState === 'error' ? 'bg-red-400' :
            'bg-gray-400'
          }`}></div>
          <span className="text-sm text-gray-600">
            Status: {connectionState}
          </span>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Test Results:</h4>
          {testResults.map((result, index) => (
            <div key={index} className="text-xs text-gray-600 font-mono">
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}