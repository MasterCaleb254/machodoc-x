import * as tf from '@tensorflow/tfjs';
import { ModelManager, InferenceResult } from './ModelManager';

export interface UrineStripResult {
  parameters: {
    protein: number;
    glucose: number;
    ketones: number;
    leukocytes: number;
    nitrates: number;
    pH: number;
  };
  confidence: number;
  quality: {
    lighting: number;
    focus: number;
    stripPosition: number;
    overall: number;
  };
  interpretations: {
    protein: 'normal' | 'trace' | '1+' | '2+' | '3+';
    glucose: 'negative' | 'trace' | '1+' | '2+' | '3+' | '4+';
    ketones: 'negative' | 'trace' | 'small' | 'moderate' | 'large';
    leukocytes: 'negative' | 'trace' | '1+' | '2+' | '3+';
    nitrates: 'negative' | 'positive';
    pH: 'acidic' | 'neutral' | 'alkaline';
  };
  clinicalAlerts: string[];
}

export class UrineStripAnalyzer {
  private static instance: UrineStripAnalyzer;
  private modelManager: ModelManager;
  private modelId = 'urine_strip';
  private inputSize = 128;

  // Reference colors for different parameter levels
  private referenceColors = {
    protein: [
      { r: 240, g: 240, b: 240 }, // Negative
      { r: 220, g: 230, b: 240 }, // Trace
      { r: 180, g: 210, b: 240 }, // 1+
      { r: 140, g: 180, b: 240 }, // 2+
      { r: 100, g: 140, b: 240 }  // 3+
    ],
    glucose: [
      { r: 240, g: 240, b: 240 }, // Negative
      { r: 240, g: 230, b: 200 }, // Trace
      { r: 240, g: 210, b: 150 }, // 1+
      { r: 240, g: 180, b: 100 }, // 2+
      { r: 240, g: 140, b: 60 },  // 3+
      { r: 240, g: 100, b: 30 }   // 4+
    ],
    // ... similar for other parameters
  };

  private constructor() {
    this.modelManager = ModelManager.getInstance();
  }

  static getInstance(): UrineStripAnalyzer {
    if (!UrineStripAnalyzer.instance) {
      UrineStripAnalyzer.instance = new UrineStripAnalyzer();
    }
    return UrineStripAnalyzer.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.modelManager.loadModel(this.modelId);
      console.log('Urine strip analyzer initialized');
    } catch (error) {
      console.error('Failed to initialize urine strip analyzer:', error);
      throw error;
    }
  }

  async analyzeStrip(imageTensor: tf.Tensor3D): Promise<UrineStripResult> {
    try {
      // Preprocess image
      const inputTensor = await this.preprocessImage(imageTensor);
      
      // Run inference
      const result = await this.modelManager.runInference(this.modelId, inputTensor);
      
      // Postprocess results
      const analysis = await this.postprocessOutput(result.output, imageTensor);
      
      // Clean up tensors
      inputTensor.dispose();

      return analysis;

    } catch (error) {
      console.error('Urine strip analysis failed:', error);
      throw error;
    }
  }

  private async preprocessImage(imageTensor: tf.Tensor3D): Promise<tf.Tensor> {
    // Resize to model input size
    const resized = tf.image.resizeBilinear(imageTensor, [this.inputSize, this.inputSize]);
    
    // Normalize pixel values to [0, 1]
    const normalized = resized.div(255);
    
    // Add batch dimension
    return normalized.expandDims(0);
  }

  private async postprocessOutput(output: tf.Tensor | tf.Tensor[], originalImage: tf.Tensor3D): Promise<UrineStripResult> {
    if (!(output instanceof tf.Tensor)) {
      throw new Error('Expected tensor output from urine strip analyzer');
    }

    const outputData = await output.data();
    
    // Extract parameters from model output
    const parameters = this.extractParameters(outputData);
    
    // Calculate confidence and quality
    const confidence = this.calculateConfidence(outputData);
    const quality = await this.assessImageQuality(originalImage);
    
    // Generate interpretations
    const interpretations = this.generateInterpretations(parameters);
    
    // Generate clinical alerts
    const clinicalAlerts = this.generateClinicalAlerts(parameters, interpretations);

    return {
      parameters,
      confidence,
      quality,
      interpretations,
      clinicalAlerts
    };
  }

  private extractParameters(outputData: Float32Array): UrineStripResult['parameters'] {
    // Assuming output format: [protein, glucose, ketones, leukocytes, nitrates, pH]
    return {
      protein: this.sigmoid(outputData[0]), // 0-1 scale
      glucose: this.sigmoid(outputData[1]),
      ketones: this.sigmoid(outputData[2]),
      leukocytes: this.sigmoid(outputData[3]),
      nitrates: this.sigmoid(outputData[4]),
      pH: this.scaleToRange(outputData[5], 5, 8.5) // pH range
    };
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private scaleToRange(value: number, min: number, max: number): number {
    const scaled = (value + 1) / 2; // Convert from [-1,1] to [0,1]
    return min + scaled * (max - min);
  }

  private calculateConfidence(outputData: Float32Array): number {
    // Calculate confidence based on output consistency and magnitude
    const values = Array.from(outputData).slice(0, 6); // First 6 parameters
    
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    
    // Higher confidence for lower variance and reasonable values
    let confidence = 1 - Math.min(1, variance * 2);
    
    // Adjust based on value plausibility
    const plausibleValues = values.filter(v => v > -2 && v < 2).length / values.length;
    confidence *= plausibleValues;
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  private async assessImageQuality(imageTensor: tf.Tensor3D): Promise<UrineStripResult['quality']> {
    const [height, width] = imageTensor.shape;
    
    // Calculate image statistics for quality assessment
    const imageData = await imageTensor.data();
    
    let totalLuminance = 0;
    let totalContrast = 0;
    
    // Simple quality metrics
    for (let i = 0; i < imageData.length; i += 3) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      // Luminance (perceived brightness)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += luminance;
    }
    
    const avgLuminance = totalLuminance / (imageData.length / 3);
    const lighting = Math.max(0.1, Math.min(1, avgLuminance / 200)); // Normalize
    
    // Simple focus assessment (edge detection would be better)
    const focus = 0.7 + Math.random() * 0.3; // Placeholder
    
    // Strip position (assume centered for demo)
    const stripPosition = 0.8 + Math.random() * 0.2;
    
    const overall = (lighting + focus + stripPosition) / 3;
    
    return {
      lighting,
      focus,
      stripPosition,
      overall
    };
  }

  private generateInterpretations(parameters: UrineStripResult['parameters']): UrineStripResult['interpretations'] {
    return {
      protein: this.interpretProtein(parameters.protein),
      glucose: this.interpretGlucose(parameters.glucose),
      ketones: this.interpretKetones(parameters.ketones),
      leukocytes: this.interpretLeukocytes(parameters.leukocytes),
      nitrates: this.interpretNitrates(parameters.nitrates),
      pH: this.interpretPH(parameters.pH)
    };
  }

  private interpretProtein(value: number): UrineStripResult['interpretations']['protein'] {
    if (value < 0.1) return 'normal';
    if (value < 0.3) return 'trace';
    if (value < 0.5) return '1+';
    if (value < 0.7) return '2+';
    return '3+';
  }

  private interpretGlucose(value: number): UrineStripResult['interpretations']['glucose'] {
    if (value < 0.1) return 'negative';
    if (value < 0.25) return 'trace';
    if (value < 0.4) return '1+';
    if (value < 0.6) return '2+';
    if (value < 0.8) return '3+';
    return '4+';
  }

  private interpretKetones(value: number): UrineStripResult['interpretations']['ketones'] {
    if (value < 0.1) return 'negative';
    if (value < 0.3) return 'trace';
    if (value < 0.5) return 'small';
    if (value < 0.7) return 'moderate';
    return 'large';
  }

  private interpretLeukocytes(value: number): UrineStripResult['interpretations']['leukocytes'] {
    if (value < 0.1) return 'negative';
    if (value < 0.3) return 'trace';
    if (value < 0.5) return '1+';
    if (value < 0.7) return '2+';
    return '3+';
  }

  private interpretNitrates(value: number): UrineStripResult['interpretations']['nitrates'] {
    return value < 0.5 ? 'negative' : 'positive';
  }

  private interpretPH(value: number): UrineStripResult['interpretations']['pH'] {
    if (value < 6.0) return 'acidic';
    if (value < 7.5) return 'neutral';
    return 'alkaline';
  }

  private generateClinicalAlerts(
    parameters: UrineStripResult['parameters'],
    interpretations: UrineStripResult['interpretations']
  ): string[] {
    const alerts: string[] = [];

    if (interpretations.protein !== 'normal') {
      alerts.push('Proteinuria detected - consider renal function assessment');
    }

    if (interpretations.glucose !== 'negative') {
      alerts.push('Glycosuria detected - consider diabetes screening');
    }

    if (interpretations.ketones !== 'negative') {
      alerts.push('Ketones detected - assess for diabetic ketoacidosis or starvation');
    }

    if (interpretations.leukocytes !== 'negative') {
      Object.values(result.parameters).every(param => 
        param >= 0 && param <= (param === result.parameters.pH ? 9 : 1)
      )
    );
  }
}
