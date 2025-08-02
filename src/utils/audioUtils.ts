export const convertWebMToPCM = async (webmData: ArrayBuffer): Promise<ArrayBuffer> => {
  try {
    // Create a new AudioContext for each conversion to avoid issues
    const audioContext = new AudioContext({ sampleRate: 16000 });
    
    // Make a copy of the ArrayBuffer to avoid detachment issues
    const audioDataCopy = webmData.slice(0);
    
    const audioBuffer = await audioContext.decodeAudioData(audioDataCopy);
    
    // Get audio data from the first channel
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      // Convert from [-1, 1] to [-32768, 32767]
      pcmData[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32767));
    }
    
    await audioContext.close();
    return pcmData.buffer;
  } catch (error) {
    console.error('Error converting audio:', error);
    // Return a small silent PCM buffer as fallback
    const silentPCM = new Int16Array(1600); // 100ms of silence at 16kHz
    return silentPCM.buffer;
  }
};

export const resampleAudio = async (audioBuffer: AudioBuffer, targetSampleRate: number = 16000): Promise<Float32Array> => {
  const audioContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  
  const resampled = await audioContext.startRendering();
  return resampled.getChannelData(0);
};