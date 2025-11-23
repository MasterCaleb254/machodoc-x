import AudioRecord from 'react-native-audio-record';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface AudioRecordingConfig {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  audioSource?: number;
  wavFile?: string;
  maxDuration?: number;
}

export interface RecordingResult {
  filePath: string;
  duration: number;
  fileSize: number;
  sampleRate: number;
  channels: number;
  timestamp: number;
  type: 'cough' | 'breathing' | 'speech';
}

export class AudioRecorder {
  private static instance: AudioRecorder;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private currentRecordingPath: string = '';

  static getInstance(): AudioRecorder {
    if (!AudioRecorder.instance) {
      AudioRecorder.instance = new AudioRecorder();
    }
    return AudioRecorder.instance;
  }

  async initialize(config?: AudioRecordingConfig): Promise<void> {
    const defaultConfig: AudioRecordingConfig = {
      sampleRate: 44100,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // MIC source
      wavFile: 'audio_recording.wav',
      maxDuration: 30 // seconds
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      await AudioRecord.init(finalConfig);
      console.log('Audio recorder initialized with config:', finalConfig);
    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      throw error;
    }
  }

  async startRecording(type: 'cough' | 'breathing' | 'speech' = 'cough'): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${type}_${timestamp}.wav`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

      // Update the recording path
      this.currentRecordingPath = filePath;

      // Start recording
      await AudioRecord.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      console.log(`Started ${type} recording:`, filePath);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    try {
      // Stop recording
      const filePath = await AudioRecord.stop();
      this.isRecording = false;

      const duration = (Date.now() - this.recordingStartTime) / 1000;
      
      // Verify file exists and get info
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('Recorded file not found');
      }

      const fileInfo = await RNFS.stat(filePath);
      const fileSize = parseInt(fileInfo.size, 10);

      // Determine recording type based on duration and context
      let recordingType: 'cough' | 'breathing' | 'speech' = 'cough';
      if (duration > 10) {
        recordingType = 'speech';
      } else if (duration > 3) {
        recordingType = 'breathing';
      }

      const result: RecordingResult = {
        filePath,
        duration,
        fileSize,
        sampleRate: 44100, // Would extract from file in real implementation
        channels: 1,
        timestamp: this.recordingStartTime,
        type: recordingType
      };

      console.log('Recording completed:', result);
      return result;

    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      await AudioRecord.stop();
      this.isRecording = false;
      
      // Clean up the partial recording file
      if (this.currentRecordingPath && await RNFS.exists(this.currentRecordingPath)) {
        await RNFS.unlink(this.currentRecordingPath);
      }
      
      console.log('Recording cancelled');
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  }

  isRecordingInProgress(): boolean {
    return this.isRecording;
  }

  getRecordingDuration(): number {
      console.error('Error cleaning up recording file:', error);
    }
  }
}
