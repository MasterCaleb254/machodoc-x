import * as tf from '@tensorflow/tfjs';
import { ModelManager, InferenceResult } from './ModelManager';

export interface CoughClassification {
  type: 'dry' | 'wet' | 'barking' | 'whooping' | 'productive';
  confidence: number;
  features: {
    harshness: number;
    wetness: number;
    duration: number;
    intensity: number;
    frequency: number;
  };
  clinicalIndicators: {
    pneumoniaRisk: number;
    tuberculosisSuspicion: number;
    covidLikelihood: number;
    bronchitisIndicator: number;
    asthmaIndicator: number;
  };
}

export class CoughClassifier {
  private static instance: CoughClassifier;
  private modelManager: ModelManager;
  private modelId = 'cough_classifier';
  private sampleRate = 16000;
  private frameLength = 16000; // 1 second at 16kHz

  private coughTypes = ['dry', 'wet', 'barking', 'whooping', 'productive'];
  
  private constructor() {
    this.modelManager = ModelManager.getInstance();
  }

  static getInstance(): CoughClassifier {
    if (!CoughClassifier.instance) {
      CoughClassifier.instance = new CoughClassifier();
    }
    return CoughClassifier.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.modelManager.loadModel(this.modelId);
      console.log('Cough classifier initialized');
    } catch (error) {
      console.error('Failed to initialize cough classifier:', error);
      throw error;
    }
  }

  async classifyCough(audioData: Float32Array | number[]): Promise<CoughClassification> {
    try {
      // Preprocess audio data
      const inputTensor = await this.preprocessAudio(audioData);
      
      // Run inference
      const result = await this.modelManager.runInference(this.modelId, inputTensor);
      
      // Postprocess results
      const classification = this.postprocessOutput(result.output);
      
      // Clean up tensors
      inputTensor.dispose();
      if (result.output instanceof tf.Tensor) {
        result.output.dispose();
      }

      return classification;

    } catch (error) {
      console.error('Cough classification failed:', error);
      throw error;
    }
  }

  private async preprocessAudio(audioData: Float32Array | number[]): Promise<tf.Tensor> {
    // Convert to Float32Array if needed
    const floatData = audioData instanceof Float32Array ? audioData : new Float32Array(audioData);
    
    // Ensure correct length (pad or truncate)
    const processedData = this.normalizeAudioLength(floatData);
  private applyPreEmphasis(data: Float32Array, coefficient: number = 0.97): Float32Array {
    const emphasized = new Float32Array(data.length);
    emphasized[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      emphasized[i] = data[i] - coefficient * data[i - 1];
    }
    
    return emphasized;
  }

  private computeMelSpectrogram(data: Float32Array): number[][] {
    // Simplified mel-spectrogram computation
    // In production, this would use proper FFT and mel filter banks
    
    const frameSize = 512;
    const hopSize = 256;
    const nMelBands = 64;
    
    const frames: number[][] = [];
    
    for (let i = 0; i <= data.length - frameSize; i += hopSize) {
      const frame = Array.from(data.subarray(i, i + frameSize));
      
      // Apply window function (Hann window)
      const windowedFrame = this.applyHannWindow(frame);
      
      // Compute power spectrum (simplified)
      const powerSpectrum = this.computePowerSpectrum(windowedFrame);
      
      // Apply mel filter banks (simplified)
      const melSpectrum = this.applyMelFilterBank(powerSpectrum, nMelBands);
      
      frames.push(melSpectrum);
    }
    
    return frames;
  }

  private applyHannWindow(frame: number[]): number[] {
    return frame.map((value, index) => {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * index / (frame.length - 1)));
      return value * window;
    });
  }

  private computePowerSpectrum(frame: number[]): number[] {
    // Simplified power spectrum computation
    // In production, use FFT
    const spectrum = new Array(frame.length / 2).fill(0);
    
    for (let i = 0; i < frame.length / 2; i++) {
      spectrum[i] = Math.pow(frame[i], 2);
    }
    
    return spectrum;
  }

  private applyMelFilterBank(spectrum: number[], nBands: number): number[] {
    const melBands = new Array(nBands).fill(0);
    
    // Simplified mel filter bank application
    for (let i = 0; i < nBands; i++) {
      const start = Math.floor(i * spectrum.length / nBands);
      const end = Math.floor((i + 1) * spectrum.length / nBands);
      
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += spectrum[j];
      }
      melBands[i] = sum / (end - start);
    }
    
    return melBands;
  }

  private normalizeSpectrogram(spectrogram: number[][]): number[][][] {
    // Convert to log scale
    const logSpectrogram = spectrogram.map(frame => 
      frame.map(value => Math.log10(value + 1e-6))
    );
    
    // Compute mean and std for normalization
    const flatValues = logSpectrogram.flat();
    const mean = flatValues.reduce((a, b) => a + b) / flatValues.length;
    const std = Math.sqrt(flatValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / flatValues.length);
    
    // Normalize
    return [logSpectrogram.map(frame => 
      frame.map(value => (value - mean) / (std + 1e-6))
    )];
  }

  private postprocessOutput(output: tf.Tensor | tf.Tensor[]): CoughClassification {
    if (!(output instanceof tf.Tensor)) {
      throw new Error('Expected tensor output from cough classifier');
    }

    const data = output.dataSync();
    const probabilities = Array.from(data);
    
    // Find predicted class
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const predictedType = this.coughTypes[maxIndex] as CoughClassification['type'];
    const confidence = probabilities[maxIndex];

    // Extract audio features from model outputs
    const features = this.extractAudioFeatures(probabilities);
    
    // Calculate clinical indicators
    const clinicalIndicators = this.calculateClinicalIndicators(predictedType, features, probabilities);

    return {
      type: predictedType,
      confidence,
      features,
      clinicalIndicators
    };
  }

  private extractAudioFeatures(probabilities: number[]): CoughClassification['features'] {
    // Extract features from model outputs or probabilities
    return {
      harshness: this.calculateHarshness(probabilities),
      wetness: this.calculateWetness(probabilities),
      duration: 0, // Would be calculated from audio length
      intensity: Math.max(...probabilities),
      frequency: this.calculateDominantFrequency(probabilities)
    };
  }

  private calculateHarshness(probabilities: number[]): number {
    // Harsh coughs have higher energy in high frequencies
    // Weight dry and barking coughs more
    const harshWeights = [0.8, 0.2, 0.9, 0.7, 0.3]; // dry, wet, barking, whooping, productive
    return probabilities.reduce((sum, prob, idx) => sum + prob * harshWeights[idx], 0);
  }

  private calculateWetness(probabilities: number[]): number {
    // Wet/productive coughs have different characteristics
    const wetWeights = [0.1, 0.9, 0.2, 0.3, 0.8]; // dry, wet, barking, whooping, productive
    return probabilities.reduce((sum, prob, idx) => sum + prob * wetWeights[idx], 0);
  }

  private calculateDominantFrequency(probabilities: number[]): number {
    // Different cough types have characteristic frequencies
    const baseFrequencies = [500, 300, 800, 400, 350]; // Hz for each cough type
    return probabilities.reduce((sum, prob, idx) => sum + prob * baseFrequencies[idx], 0);
  }

  private calculateClinicalIndicators(
    coughType: string, 
    features: CoughClassification['features'],
    probabilities: number[]
  ): CoughClassification['clinicalIndicators'] {
    return {
      pneumoniaRisk: this.calculatePneumoniaRisk(coughType, features),
      tuberculosisSuspicion: this.calculateTuberculosisSuspicion(coughType, features),
      covidLikelihood: this.calculateCovidLikelihood(coughType, features),
      bronchitisIndicator: this.calculateBronchitisIndicator(coughType, features),
      asthmaIndicator: this.calculateAsthmaIndicator(coughType, features)
    };
  }

  private calculatePneumoniaRisk(coughType: string, features: any): number {
    // Pneumonia often presents with wet/productive cough
    let risk = 0;
    
    if (coughType === 'wet' || coughType === 'productive') {
      risk += 0.6;
    }
    
    if (features.harshness > 0.7) {
      risk += 0.3;
    }
    
    return Math.min(1, risk);
  }

  private calculateTuberculosisSuspicion(coughType: string, features: any): number {
    // TB suspicion based on chronic cough characteristics
    let suspicion = 0;
    
    if (coughType === 'productive' && features.duration > 2.0) {
      suspicion += 0.7;
    }
    
    if (features.intensity > 0.8) {
      suspicion += 0.3;
    }
    
    return Math.min(1, suspicion);
  }

  private calculateCovidLikelihood(coughType: string, features: any): number {
    // COVID often presents with dry, persistent cough
    let likelihood = 0;
    
    if (coughType === 'dry') {
      likelihood += 0.6;
    }
    
    if (features.harshness > 0.6) {
      likelihood += 0.4;
    }
    
    return Math.min(1, likelihood);
  }

  private calculateBronchitisIndicator(coughType: string, features: any): number {
    // Bronchitis often has productive cough
    return coughType === 'productive' || coughType === 'wet' ? 0.8 : 0.2;
  }

  private calculateAsthmaIndicator(coughType: string, features: any): number {
    // Asthma may present with dry cough, especially cough-variant asthma
    return coughType === 'dry' ? 0.7 : 0.3;
  }

  async getModelStatus() {
    return this.modelManager.getModelStatus(this.modelId);
  }
}
