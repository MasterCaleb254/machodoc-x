import { AudioRecorder, RecordingResult } from './AudioRecorder';
import { AudioFeatureExtractor, AudioFeatures } from './AudioFeatureExtractor';
import { CoughAnalyzer, CoughAnalysis } from './CoughAnalyzer';
import { AudioPermissions } from './AudioPermissions';

export interface AudioAnalysisResult {
  recording: RecordingResult;
  features: AudioFeatures;
  coughAnalysis?: CoughAnalysis;
  respiratoryAnalysis?: any; // Would define proper type
  speechAnalysis?: any; // Would define proper type
  processingTime: number;
  confidence: number;
}

export class AudioProcessingManager {
  private static instance: AudioProcessingManager;
  private audioRecorder: AudioRecorder;
  private featureExtractor: AudioFeatureExtractor;
  private coughAnalyzer: CoughAnalyzer;

  private constructor() {
    this.audioRecorder = AudioRecorder.getInstance();
    this.featureExtractor = AudioFeatureExtractor.getInstance();
    this.coughAnalyzer = CoughAnalyzer.getInstance();
  }

  static getInstance(): AudioProcessingManager {
    if (!AudioProcessingManager.instance) {
      AudioProcessingManager.instance = new AudioProcessingManager();
    }
    return AudioProcessingManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Check and request permissions
      const hasPermissions = await AudioPermissions.ensurePermissions();
      if (!hasPermissions) {
        throw new Error('Audio recording permissions denied');
      }

      // Initialize audio recorder
      await this.audioRecorder.initialize();

      console.log('Audio processing manager initialized');
    } catch (error) {
      console.error('Failed to initialize audio processing manager:', error);
      throw error;
    }
  }

  async recordAndAnalyze(type: 'cough' | 'breathing' | 'speech'): Promise<AudioAnalysisResult> {
    const startTime = Date.now();

    try {
      // Start recording
      await this.audioRecorder.startRecording(type);

      // For cough: record for 3 seconds, for speech: 10 seconds, for breathing: 5 seconds
      const durations = {
        cough: 3000,
        breathing: 5000,
        speech: 10000
      };

      // Wait for recording to complete
      await new Promise(resolve => setTimeout(resolve, durations[type]));

      // Stop recording
      const recording = await this.audioRecorder.stopRecording();

      // Extract features
      const features = await this.featureExtractor.extractFeatures(recording.filePath, type);

      // Perform type-specific analysis
      let coughAnalysis: CoughAnalysis | undefined;
      let respiratoryAnalysis: any;
      let speechAnalysis: any;

      if (type === 'cough') {
        coughAnalysis = this.coughAnalyzer.analyzeCough(features);
      } else if (type === 'breathing') {
        respiratoryAnalysis = this.analyzeRespiratorySounds(features);
      } else if (type === 'speech') {
        speechAnalysis = this.analyzeSpeechPatterns(features);
      }

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(features, coughAnalysis);

      const result: AudioAnalysisResult = {
        recording,
        features,
        coughAnalysis,
        respiratoryAnalysis,
        speechAnalysis,
        processingTime,
        confidence
      };

      console.log(`Audio analysis completed for ${type}:`, result);
      return result;

    } catch (error) {
      console.error('Audio recording and analysis failed:', error);
      throw error;
    }
  }

  private analyzeRespiratorySounds(features: AudioFeatures): any {
    // Implement respiratory sound analysis
    return {
      cracklesScore: features.respiratoryFeatures.cracklesPresence,
      wheezingScore: features.respiratoryFeatures.wheezingPresence,
      breathQuality: features.quality.overallQuality,
      respiratoryRate: this.estimateRespiratoryRate(features)
    };
  }

  private analyzeSpeechPatterns(features: AudioFeatures): any {
    // Implement speech pattern analysis for stroke detection
    return {
      rhythmStability: features.speechFeatures.rhythmStability,
      articulationRate: features.speechFeatures.articulationRate,
      pitchVariation: features.speechFeatures.pitchVariation,
      voiceQuality: features.speechFeatures.voiceQuality,
      strokeRisk: this.calculateStrokeRisk(features)
    };
  }

  private estimateRespiratoryRate(features: AudioFeatures): number {
    // Estimate breaths per minute from audio
    // Mock implementation
    return 12 + Math.random() * 8;
  }

  private calculateStrokeRisk(features: AudioFeatures): number {
    // Calculate stroke risk from speech patterns
    const rhythmInstability = 1 - features.speechFeatures.rhythmStability;
    const articulationProblems = Math.max(0, 1 - features.speechFeatures.articulationRate / 180);
    
    return Math.min(1, rhythmInstability * 0.6 + articulationProblems * 0.4);
  }

  private calculateOverallConfidence(features: AudioFeatures, coughAnalysis?: CoughAnalysis): number {
    let confidence = features.quality.overallQuality;

    if (coughAnalysis) {
      confidence = (confidence + coughAnalysis.confidence) / 2;
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  async cancelCurrentRecording(): Promise<void> {
    await this.audioRecorder.cancelRecording();
  }

  isRecording(): boolean {
    return this.audioRecorder.isRecordingInProgress();
  }

  getRecordingDuration(): number {
    return this.audioRecorder.getRecordingDuration();
  }

  async cleanupAudioFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      await this.audioRecorder.cleanupRecording(filePath);
    }
  }
}
