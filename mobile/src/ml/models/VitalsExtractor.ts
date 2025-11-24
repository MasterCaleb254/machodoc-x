import * as tf from '@tensorflow/tfjs';
import { ModelManager, InferenceResult } from './ModelManager';

export interface Vitals {
  heartRate: number;
  respirationRate: number;
  heartRateVariability: number;
  confidence: number;
  signalQuality: {
    ppgQuality: number;
    respiratoryQuality: number;
    overallQuality: number;
  };
}

export interface VitalsAnalysis {
  vitals: Vitals;
  trends: {
    heartRate: number[];
    respirationRate: number[];
    timestamps: number[];
  };
  abnormalities: {
    tachycardia: boolean;
    bradycardia: boolean;
    tachypnea: boolean;
    bradypnea: boolean;
  };
}

export class VitalsExtractor {
  private static instance: VitalsExtractor;
  private modelManager: ModelManager;
  private modelId = 'vitals_extractor';
  private frameRate = 30;
  private analysisDuration = 10; // seconds

  private constructor() {
    this.modelManager = ModelManager.getInstance();
  }

  static getInstance(): VitalsExtractor {
    if (!VitalsExtractor.instance) {
      VitalsExtractor.instance = new VitalsExtractor();
    }
    return VitalsExtractor.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.modelManager.loadModel(this.modelId);
      console.log('Vitals extractor initialized');
    } catch (error) {
      console.error('Failed to initialize vitals extractor:', error);
      throw error;
    }
  }

  async extractVitalsFromVideo(frames: tf.Tensor4D[]): Promise<VitalsAnalysis> {
    try {
      if (frames.length < this.frameRate * 2) {
        throw new Error(`Insufficient frames. Need at least ${this.frameRate * 2} frames`);
      }

      // Preprocess frames
      const processedFrames = await this.preprocessFrames(frames);
      
      // Run inference
      const result = await this.modelManager.runInference(this.modelId, processedFrames);
      
      // Postprocess results
      const analysis = this.postprocessOutput(result.output, frames.length);
      
      // Clean up tensors
      processedFrames.dispose();

      return analysis;

    } catch (error) {
      console.error('Vitals extraction failed:', error);
      throw error;
    }
  }

  async extractVitalsFromROI(
    frames: tf.Tensor3D[], 
    roi: { x: number; y: number; width: number; height: number }
  ): Promise<VitalsAnalysis> {
    try {
      // Extract ROI from each frame
      const roiFrames = frames.map(frame => 
        tf.tidy(() => {
          return tf.image.cropAndResize(
            frame.expandDims(0),
            [[
              roi.y / frame.shape[0],
              roi.x / frame.shape[1],
              (roi.y + roi.height) / frame.shape[0],
              (roi.x + roi.width) / frame.shape[1]
            ]],
            [0],
            [64, 64]
          ).squeeze();
        })
      );

      const analysis = await this.extractVitalsFromVideo(
        roiFrames.map(f => f.expandDims() as tf.Tensor4D)
      );

      // Clean up ROI frames
      roiFrames.forEach(frame => frame.dispose());

      return analysis;

    } catch (error) {
      console.error('ROI-based vitals extraction failed:', error);
      throw error;
    }
  }

  private async preprocessFrames(frames: tf.Tensor4D[]): Promise<tf.Tensor> {
    // Convert frames to green channel (for PPG signal)
    const greenChannelFrames = frames.map(frame => 
      tf.tidy(() => {
        // Extract green channel (index 1 for RGB)
        const channels = tf.split(frame, 3, -1);
        const greenChannel = channels[1];
        channels.forEach(c => c.dispose());
        return greenChannel;
      })
    );

    // Stack frames and normalize
    const stacked = tf.stack(greenChannelFrames);
    const normalized = stacked.div(255.0);
    
    // Clean up intermediate tensors
    greenChannelFrames.forEach(frame => frame.dispose());

    return normalized;
  }

  private postprocessOutput(output: tf.Tensor | tf.Tensor[], numFrames: number): VitalsAnalysis {
    if (!(output instanceof tf.Tensor)) {
      throw new Error('Expected tensor output from vitals extractor');
    }

    const outputData = output.dataSync();
    
    // Extract vitals from model output
    const vitals = this.extractVitalsFromOutput(outputData);
    
    // Generate trends
    const trends = this.generateTrends(outputData, numFrames);
    
    // Detect abnormalities
    const abnormalities = this.detectAbnormalities(vitals);

    return {
      vitals,
      trends,
      abnormalities
    };
  }

  private extractVitalsFromOutput(outputData: Float32Array): Vitals {
    // Assuming output format: [hr, rr, hrv, ppg_quality, resp_quality]
    const heartRate = outputData[0] * 100 + 60; // Scale to typical range
    const respirationRate = outputData[1] * 30 + 12; // Scale to typical range
    const heartRateVariability = outputData[2] * 100; // Scale to typical range
    
    const ppgQuality = Math.max(0.1, Math.min(1, outputData[3]));
    const respiratoryQuality = Math.max(0.1, Math.min(1, outputData[4]));
    const overallQuality = (ppgQuality + respiratoryQuality) / 2;

    return {
      heartRate: Math.round(heartRate),
      respirationRate: Math.round(respirationRate * 10) / 10,
      heartRateVariability: Math.round(heartRateVariability * 10) / 10,
      confidence: overallQuality,
      signalQuality: {
        ppgQuality,
        respiratoryQuality,
        overallQuality
      }
    };
  }

  private generateTrends(outputData: Float32Array, numFrames: number): VitalsAnalysis['trends'] {
    const heartRateTrend: number[] = [];
    const respirationRateTrend: number[] = [];
    const timestamps: number[] = [];
    
    const frameDuration = 1000 / this.frameRate; // ms per frame
    
    // Generate synthetic trends for demo
    for (let i = 0; i < numFrames; i += this.frameRate) { // One data point per second
      const time = i * frameDuration;
      const hr = 70 + 10 * Math.sin(time / 1000) + (Math.random() - 0.5) * 5;
      const rr = 16 + 4 * Math.sin(time / 2000) + (Math.random() - 0.5) * 2;
      
      heartRateTrend.push(Math.round(hr));
      respirationRateTrend.push(Math.round(rr * 10) / 10);
      timestamps.push(time);
    }
    
    return {
      heartRate: heartRateTrend,
      respirationRate: respirationRateTrend,
      timestamps
    };
  }

  private detectAbnormalities(vitals: Vitals): VitalsAnalysis['abnormalities'] {
    return {
      tachycardia: vitals.heartRate > 100,
      bradycardia: vitals.heartRate < 60,
      tachypnea: vitals.respirationRate > 20,
      bradypnea: vitals.respirationRate < 12
    };
  }

  async extractFromFacialVideo(frames: tf.Tensor3D[]): Promise<VitalsAnalysis> {
    // Automatically detect facial ROI for vitals extraction
    const facialDetector = FacialLandmarkDetector.getInstance();
    
    try {
      // Use first frame to detect face and find good ROI for PPG
      const firstFrame = frames[0];
      const analysis = await facialDetector.detectLandmarks(firstFrame);
      
      // Use forehead region for PPG (good vascularization)
      const foreheadROI = this.calculateForeheadROI(analysis.landmarks);
      
      return await this.extractVitalsFromROI(frames, foreheadROI);
      
    } catch (error) {
      console.error('Facial-based vitals extraction failed, falling back to full frame:', error);
      return await this.extractVitalsFromVideo(frames.map(f => f.expandDims() as tf.Tensor4D));
    }
  }

  private calculateForeheadROI(landmarks: any[]): { x: number; y: number; width: number; height: number } {
    // Calculate forehead region based on facial landmarks
    const eyebrowPoints = landmarks.slice(17, 27); // Both eyebrows
    const nosePoints = landmarks.slice(27, 31); // Top of nose
    
    const minX = Math.min(...eyebrowPoints.map(p => p.x));
    const maxX = Math.max(...eyebrowPoints.map(p => p.x));
    const minY = Math.min(...eyebrowPoints.map(p => p.y));
    const maxY = Math.max(...nosePoints.map(p => p.y));
    
    const width = maxX - minX;
    const height = (maxY - minY) * 0.5; // Upper half of forehead-nose region
    
    return {
      x: minX + width * 0.25,
      y: minY,
      width: width * 0.5,
      height: height
    };
  }

  validateVitals(vitals: Vitals): boolean {
    return (
      vitals.heartRate >= 30 && vitals.heartRate <= 200 &&
      vitals.respirationRate >= 6 && vitals.respirationRate <= 50 &&
      vitals.heartRateVariability >= 0 && vitals.heartRateVariability <= 200 &&
      vitals.confidence >= 0.1
    );
  }
}
