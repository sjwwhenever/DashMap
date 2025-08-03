export class AudioManager {
  private mediaRecorder: MediaRecorder | null;
  private audioStream: MediaStream | null;
  private audioContext: AudioContext | null;
  private isRecording: boolean;
  private onAudioDataCallback: ((audioData: ArrayBuffer) => void) | null;
  private recordingProcessor: ScriptProcessorNode | null;
  private audioQueue: ArrayBuffer[];
  private isPlaying: boolean;

  constructor() {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioContext = null;
    this.isRecording = false;
    this.onAudioDataCallback = null;
    this.recordingProcessor = null;
    this.audioQueue = [];
    this.isPlaying = false;
  }

  async requestPermission(): Promise<boolean> {
    try {
      console.log("Requesting microphone permission...");

      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("Microphone permission granted");
      return true;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      throw new Error(
        "Microphone access denied. Please allow microphone access and try again."
      );
    }
  }

  async startRecording(onAudioData: (audioData: ArrayBuffer) => void): Promise<void> {
    if (!this.audioStream) {
      throw new Error(
        "Audio stream not available. Please request permission first."
      );
    }

    this.onAudioDataCallback = onAudioData;

    try {
      // Create audio context for processing
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = this.audioContext.createMediaStreamSource(
        this.audioStream
      );

      // Create a script processor for real-time audio processing
      // Note: ScriptProcessorNode is deprecated, but AudioWorkletNode requires more complex setup
      // For MVP purposes, using ScriptProcessorNode is acceptable
      this.recordingProcessor = this.audioContext.createScriptProcessor(
        4096,
        1,
        1
      );

      this.recordingProcessor.onaudioprocess = (event) => {
        if (this.isRecording && this.onAudioDataCallback) {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // Convert float32 to int16 PCM format (16kHz, 16-bit)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          // Send the audio data
          this.onAudioDataCallback(pcmData.buffer);
        }
      };

      source.connect(this.recordingProcessor);
      this.recordingProcessor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }

  stopRecording(): void {
    this.isRecording = false;

    if (this.recordingProcessor) {
      this.recordingProcessor.disconnect();
      this.recordingProcessor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log("Recording stopped");
  }

  async playAudio(base64Audio: string): Promise<void> {
    try {
      // Decode base64 to array buffer
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Add to queue instead of playing immediately
      this.audioQueue.push(bytes.buffer);
      await this.processAudioQueue();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  }

  async playAudioBuffer(audioData: ArrayBuffer): Promise<void> {
    // Add to queue instead of playing immediately
    this.audioQueue.push(audioData);
    await this.processAudioQueue();
  }

  async processAudioQueue(): Promise<void> {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    this.isPlaying = true;

    try {
      while (this.audioQueue.length > 0) {
        const audioData = this.audioQueue.shift()!;
        await this.playAudioBufferDirect(audioData);
      }
    } finally {
      this.isPlaying = false;
    }
  }

  async playAudioBufferDirect(audioData: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create audio context for playback if not exists
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }

        // Convert PCM data to audio buffer
        this.pcmToAudioBuffer(audioData)
          .then((audioBuffer) => {
            // Play the audio
            const source = this.audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext!.destination);

            // Resolve when audio finishes playing
            source.onended = () => {
              resolve();
            };

            source.start();
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async pcmToAudioBuffer(pcmData: ArrayBuffer): Promise<AudioBuffer> {
    const audioContext = this.audioContext!;
    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);

    // Convert Int16 PCM to Float32
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create audio buffer
    const audioBuffer = audioContext.createBuffer(
      1,
      float32Array.length,
      16000
    );
    audioBuffer.copyToChannel(float32Array, 0);

    return audioBuffer;
  }

  cleanup(): void {
    this.stopRecording();

    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.audioStream = null;
    }

    console.log("Audio manager cleaned up");
  }
}

export default AudioManager;