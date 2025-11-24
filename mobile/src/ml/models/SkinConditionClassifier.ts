import * as tf from '@tensorflow/tfjs';
import { ModelManager, InferenceResult } from './ModelManager';

export interface SkinCondition {
  condition: string;
  confidence: number;
  differentialDiagnosis: Array<{
    condition: string;
    confidence: number;
    keyFeatures: string[];
  }>;
  severity: 'mild' | 'moderate' | 'severe';
  characteristics: {
    color: string[];
    texture: string[];
    pattern: string[];
    distribution: string[];
  };
  clinicalRecommendations: string[];
}

export interface SkinAnalysis {
  primaryCondition: SkinCondition;
  secondaryFindings: SkinCondition[];
  imageQuality: {
    focus: number;
    lighting: number;
    colorAccuracy: number;
    overall: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  urgency: 'routine' | 'urgent' | 'emergency';
}

export class SkinConditionClassifier {
  private static instance: SkinConditionClassifier;
  private modelManager: ModelManager;
  private modelId = 'skin_condition';
  private inputSize = 224;

  private conditions = [
    'acne',
    'eczema',
    'psoriasis',
    'fungal_infection',
    'bacterial_infection',
    'viral_rash',
    'contact_dermatitis',
    'normal'
  ];

  private conditionMetadata = {
    acne: {
      severityLevels: { mild: 0.3, moderate: 0.6, severe: 0.8 },
      characteristics: ['comedones', 'papules', 'pustules', 'inflammation'],
      recommendations: ['topical_retinoids', 'benzoyl_peroxide', 'antibiotics']
    },
    eczema: {
      severityLevels: { mild: 0.4, moderate: 0.7, severe: 0.9 },
      characteristics: ['erythema', 'scaling', 'lichenification', 'pruritus'],
      recommendations: ['moisturizers', 'topical_corticosteroids', 'avoid_triggers']
    },
    // ... metadata for other conditions
  };

  private constructor() {
    this.modelManager = ModelManager.getInstance();
  }

  static getInstance(): SkinConditionClassifier {
    if (!SkinConditionClassifier.instance) {
      SkinConditionClassifier.instance = new SkinConditionClassifier();
    }
    return SkinConditionClassifier.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.modelManager.loadModel(this.modelId);
      console.log('Skin condition classifier initialized');
    } catch (error) {
      console.error('Failed to initialize skin condition classifier:', error);
      throw error;
    }
  }

  async classifySkinCondition(imageTensor: tf.Tensor3D): Promise<SkinAnalysis> {
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
      console.error('Skin condition classification failed:', error);
      throw error;
    }
  }

  private async preprocessImage(imageTensor: tf.Tensor3D): Promise<tf.Tensor> {
    // Resize to model input size
    const resized = tf.image.resizeBilinear(imageTensor, [this.inputSize, this.inputSize]);
    
    // Normalize pixel values (ImageNet normalization)
    const normalized = resized.div(255).sub(0.5).mul(2);
    
    // Add batch dimension
    return normalized.expandDims(0);
  }

  private async postprocessOutput(output: tf.Tensor | tf.Tensor[], originalImage: tf.Tensor3D): Promise<SkinAnalysis> {
    if (!(output instanceof tf.Tensor)) {
      throw new Error('Expected tensor output from skin condition classifier');
    }

    const outputData = await output.data();
    const probabilities = Array.from(outputData);
    
    // Get primary condition
    const primaryCondition = this.getPrimaryCondition(probabilities);
    
    // Get differential diagnosis
    const differentialDiagnosis = this.getDifferentialDiagnosis(probabilities);
    
    // Get secondary findings
    const secondaryFindings = this.getSecondaryFindings(probabilities);
    
    // Assess image quality
    const imageQuality = await this.assessImageQuality(originalImage);
    
    // Determine risk level and urgency
    const riskLevel = this.determineRiskLevel(primaryCondition);
    const urgency = this.determineUrgency(primaryCondition, riskLevel);

    return {
      primaryCondition,
      secondaryFindings,
      imageQuality,
      riskLevel,
      urgency
    };
  }

  private getPrimaryCondition(probabilities: number[]): SkinCondition {
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const condition = this.conditions[maxIndex];
    const confidence = probabilities[maxIndex];
    
    return {
      condition,
      confidence,
      differentialDiagnosis: this.getDifferentialDiagnosis(probabilities).slice(0, 3),
      severity: this.determineSeverity(condition, confidence),
      characteristics: this.extractCharacteristics(condition, confidence),
      clinicalRecommendations: this.generateRecommendations(condition, confidence)
    };
  }

  private getDifferentialDiagnosis(probabilities: number[]): SkinCondition['differentialDiagnosis'] {
    return probabilities
      .map((confidence, index) => ({
        condition: this.conditions[index],
        confidence,
        keyFeatures: this.getKeyFeatures(this.conditions[index])
      }))
      .filter(diagnosis => diagnosis.confidence > 0.1)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 differentials
  }

  private getSecondaryFindings(probabilities: number[]): SkinCondition[] {
    return probabilities
      .map((confidence, index) => ({
        condition: this.conditions[index],
        confidence,
        differentialDiagnosis: [],
        severity: this.determineSeverity(this.conditions[index], confidence),
        characteristics: this.extractCharacteristics(this.conditions[index], confidence),
        clinicalRecommendations: this.generateRecommendations(this.conditions[index], confidence)
      }))
      .filter(condition => 
        condition.confidence > 0.2 && 
        condition.condition !== this.conditions[probabilities.indexOf(Math.max(...probabilities))]
      )
      .slice(0, 3); // Top 3 secondary findings
  }

  private determineSeverity(condition: string, confidence: number): SkinCondition['severity'] {
    const metadata = this.conditionMetadata[condition as keyof typeof this.conditionMetadata];
    if (!metadata) return 'mild';

    const { severityLevels } = metadata;
    
    if (confidence >= severityLevels.severe) return 'severe';
    if (confidence >= severityLevels.moderate) return 'moderate';
    return 'mild';
  }

  private extractCharacteristics(condition: string, confidence: number): SkinCondition['characteristics'] {
    const metadata = this.conditionMetadata[condition as keyof typeof this.conditionMetadata];
    if (!metadata) {
      return {
        color: ['variable'],
        texture: ['variable'],
        pattern: ['variable'],
        distribution: ['variable']
      };
    }

    // Scale characteristics based on confidence
    const characteristicCount = Math.floor(confidence * metadata.characteristics.length);
    const selectedCharacteristics = metadata.characteristics.slice(0, characteristicCount);

    return {
      color: this.getColorCharacteristics(condition, confidence),
      texture: this.getTextureCharacteristics(condition, confidence),
      pattern: selectedCharacteristics,
      distribution: this.getDistributionCharacteristics(condition, confidence)
    };
  }

  private getColorCharacteristics(condition: string, confidence: number): string[] {
    const colorMap: { [key: string]: string[] } = {
      acne: ['erythematous', 'red', 'hyperpigmented'],
      eczema: ['erythematous', 'red', 'lichenified'],
      psoriasis: ['silvery', 'erythematous', 'scaly'],
      fungal_infection: ['red', 'brown', 'hypopigmented'],
      bacterial_infection: ['yellow', 'purulent', 'crusted'],
      viral_rash: ['pink', 'red', 'vesicular']
    };
    
    return colorMap[condition] || ['variable'];
  }

  private getTextureCharacteristics(condition: string, confidence: number): string[] {
    const textureMap: { [key: string]: string[] } = {
      acne: ['papular', 'pustular', 'nodular'],
      eczema: ['scaly', 'lichenified', 'excoriated'],
      psoriasis: ['thickened', 'scaly', 'plaques'],
      fungal_infection: ['scaly', 'annular', 'active_border'],
      bacterial_infection: ['crusted', 'weeping', 'pustular'],
      viral_rash: ['maculopapular', 'vesicular', 'morbilliform']
    };
    
    return textureMap[condition] || ['variable'];
  }

  private getDistributionCharacteristics(condition: string, confidence: number): string[] {
    const distributionMap: { [key: string]: string[] } = {
    const metadata = this.conditionMetadata[condition as keyof typeof this.conditionMetadata];

    // Scale recommendations based on confidence
    const recommendationCount = Math.floor(confidence * metadata.recommendations.length);
    return metadata.recommendations.slice(0, recommendationCount);
  }

  private async assessImageQuality(imageTensor: tf.Tensor3D): Promise<SkinAnalysis['imageQuality']> {
    const [height, width] = imageTensor.shape;
    const imageData = await imageTensor.data();
    
    // Calculate basic image quality metrics
    let totalLuminance = 0;
    let totalSaturation = 0;
    
    for (let i = 0; i < imageData.length; i += 3) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      // Luminance
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      totalSaturation += saturation;
    }
    
    const avgLuminance = totalLuminance / (imageData.length / 3);
    const avgSaturation = totalSaturation / (imageData.length / 3);
    
    const lighting = Math.max(0.1, Math.min(1, avgLuminance / 200));
    const colorAccuracy = Math.max(0.1, Math.min(1, avgSaturation * 2));
    const focus = 0.7 + Math.random() * 0.3; // Placeholder for focus detection
    
    const overall = (lighting + colorAccuracy + focus) / 3;
    
    return {
      lighting,
      colorAccuracy,
      focus,
      overall
    };
  }

  private determineRiskLevel(condition: SkinCondition): SkinAnalysis['riskLevel'] {
    const highRiskConditions = ['bacterial_infection', 'severe_acne', 'severe_eczema'];
    const mediumRiskConditions = ['psoriasis', 'fungal_infection', 'moderate_acne'];
    
    if (highRiskConditions.includes(condition.condition) && condition.severity === 'severe') {
      return 'high';
    }
    
    if (mediumRiskConditions.includes(condition.condition) || condition.severity === 'moderate') {
      return 'medium';
    }
    
    return 'low';
  }

  private determineUrgency(condition: SkinCondition, riskLevel: SkinAnalysis['riskLevel']): SkinAnalysis['urgency'] {
    if (riskLevel === 'high') return 'urgent';
    if (riskLevel === 'medium' && condition.severity === 'severe') return 'urgent';
    return 'routine';
  }

  async classifyFromImageData(imageData: ImageData): Promise<SkinAnalysis> {
    const tensor = tf.browser.fromPixels(imageData);
    const result = await this.classifySkinCondition(tensor);
    tensor.dispose();
    return result;
  }
}    if (!metadata) return ['consult_dermatologist'];
  private generateRecommendations(condition: string, confidence: number): string[] {

