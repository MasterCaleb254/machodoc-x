import { SensorData } from './SensorManager';

export interface QualityScore {
  overall: number;
  camera: number;
  audio: number;
  symptoms: number;
  fusion: number;
  breakdown: {
    technical: number;
    clinical: number;
    temporal: number;
  };
}

export class QualityScorer {
  private static instance: QualityScorer;

  static getInstance(): QualityScorer {
    if (!QualityScorer.instance) {
      QualityScorer.instance = new QualityScorer();
    }
    return QualityScorer.instance;
  }

  async calculateSessionQuality(sensorData: Partial<SensorData>): Promise<QualityScore> {
    const scores = {
      overall: 0,
      camera: 0,
      audio: 0,
      symptoms: 0,
      fusion: 0,
      breakdown: {
        technical: 0,
        clinical: 0,
        temporal: 0
      }
    };

    // Calculate individual sensor scores
    if (sensorData.camera) {
      scores.camera = this.calculateCameraQuality(sensorData.camera);
    }

    if (sensorData.audio) {
      scores.audio = this.calculateAudioQuality(sensorData.audio);
    }

    if (sensorData.symptoms) {
      scores.symptoms = this.calculateSymptomsQuality(sensorData.symptoms);
    }

    // Calculate fusion score
    scores.fusion = this.calculateFusionQuality(sensorData);

    // Calculate breakdown scores
    scores.breakdown.technical = this.calculateTechnicalScore(sensorData);
    scores.breakdown.clinical = this.calculateClinicalScore(sensorData);
    scores.breakdown.temporal = this.calculateTemporalScore(sensorData);

    // Calculate overall score (weighted average)
    scores.overall = this.calculateOverallScore(scores);

    return scores;
  }

  private calculateCameraQuality(cameraData: any): number {
    let score = 1.0;

    // Resolution quality
    const megapixels = (cameraData.width * cameraData.height) / 1000000;
    if (megapixels < 1) score *= 0.7;
    else if (megapixels < 2) score *= 0.85;
    else if (megapixels > 8) score *= 1.0;

    // Lighting quality (from metadata)
    if (cameraData.metadata) {
      if (cameraData.metadata.exposure < 0) score *= 0.8;
      if (cameraData.metadata.flash) score *= 0.9; // Flash can affect color accuracy
    }

    return Math.max(0.1, Math.min(1, score));
  }

  private calculateAudioQuality(audioData: any): number {
    let score = 1.0;

    if (audioData.features?.quality) {
      const quality = audioData.features.quality;
      
      // Signal-to-noise ratio
      if (quality.signalToNoiseRatio < 15) score *= 0.7;
      else if (quality.signalToNoiseRatio < 25) score *= 0.85;

      // Background noise
      score *= (1 - quality.backgroundNoise * 0.5);

      // Clipping
      score *= (1 - quality.clipping * 0.3);

      // Overall quality from audio processor
      score *= quality.overallQuality;
    }

    // Duration adequacy
    const duration = audioData.recording?.duration || 0;
    if (duration < 1.0) score *= 0.5;
    else if (duration < 2.0) score *= 0.8;

    return Math.max(0.1, Math.min(1, score));
  }

  private calculateSymptomsQuality(symptomsData: any): number {
    let score = 1.0;

    // Check completeness of symptom data
    const symptomCount = Object.keys(symptomsData).length;
    if (symptomCount < 3) score *= 0.7;
    else if (symptomCount < 5) score *= 0.85;

    // Check for critical symptom presence
    const criticalSymptoms = ['fever', 'shortnessOfBreath', 'chestPain', 'severePain'];
    const hasCritical = criticalSymptoms.some(symptom => symptomsData[symptom] === true);
    if (hasCritical) score *= 1.1; // Bonus for capturing critical symptoms

    return Math.max(0.1, Math.min(1, score));
  }

  private calculateFusionQuality(sensorData: Partial<SensorData>): number {
    const sensorCount = this.countSensors(sensorData);
    
    if (sensorCount === 0) return 0.1;
    if (sensorCount === 1) return 0.5;
    if (sensorCount === 2) return 0.8;
    return 1.0;
  }

  private calculateTechnicalScore(sensorData: Partial<SensorData>): number {
    let score = 0;
    let count = 0;

    if (sensorData.camera) {
      score += this.calculateCameraQuality(sensorData.camera);
      count++;
    }

    if (sensorData.audio) {
      score += this.calculateAudioQuality(sensorData.audio);
      count++;
    }

    return count > 0 ? score / count : 0.5;
  }

  private calculateClinicalScore(sensorData: Partial<SensorData>): number {
    // Assess clinical relevance of captured data
    let score = 0.5; // Base score

    if (sensorData.camera) {
      // Facial analysis has high clinical value
      if (sensorData.camera.type === 'face') score += 0.3;
    }

    if (sensorData.audio) {
      // Cough and breathing analysis have high clinical value
      if (sensorData.audio.recording?.type === 'cough') score += 0.3;
      if (sensorData.audio.recording?.type === 'breathing') score += 0.2;
    }

    if (sensorData.symptoms) {
      // Symptom data is clinically valuable
      score += 0.2;
    }

    return Math.min(1, score);
  }

  private calculateTemporalScore(sensorData: Partial<SensorData>): number {
    // Assess temporal characteristics
    const currentTime = Date.now();
    const dataTime = sensorData.timestamp || currentTime;
    
    const ageMinutes = (currentTime - dataTime) / 60000;
    
    if (ageMinutes < 1) return 1.0;
    if (ageMinutes < 5) return 0.8;
    if (ageMinutes < 15) return 0.6;
    if (ageMinutes < 60) return 0.4;
    return 0.2;
  }

  private calculateOverallScore(scores: QualityScore): number {
    // Weighted average of component scores
    const weights = {
      camera: 0.3,
      audio: 0.3,
      symptoms: 0.2,
      fusion: 0.2
    };

    let weightedSum = 0;
    let totalWeight = 0;

    if (scores.camera > 0) {
      weightedSum += scores.camera * weights.camera;
      totalWeight += weights.camera;
    }

    if (scores.audio > 0) {
      weightedSum += scores.audio * weights.audio;
      totalWeight += weights.audio;
    }

    if (scores.symptoms > 0) {
      weightedSum += scores.symptoms * weights.symptoms;
      totalWeight += weights.symptoms;
    }

    weightedSum += scores.fusion * weights.fusion;
    totalWeight += weights.fusion;

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private countSensors(sensorData: Partial<SensorData>): number {
    let count = 0;
    if (sensorData.camera) count++;
    if (sensorData.audio) count++;
    if (sensorData.symptoms) count++;
    if (sensorData.location) count++;
    return count;
  }

  getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  getQualityRecommendations(score: QualityScore): string[] {
    const recommendations: string[] = [];

    if (score.camera < 0.6) {
      recommendations.push('Improve camera capture: Ensure good lighting and steady hands');
    }

    if (score.audio < 0.6) {
      recommendations.push('Improve audio capture: Record in quiet environment closer to microphone');
    }

    if (score.fusion < 0.8) {
      recommendations.push('Capture data from more sensors for better analysis');
    }

    if (score.breakdown.temporal < 0.8) {
      recommendations.push('Use more recent data for accurate analysis');
    }

    return recommendations;
  }
}
