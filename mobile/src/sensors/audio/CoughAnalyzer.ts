import { AudioFeatures } from './AudioFeatureExtractor';

export interface CoughAnalysis {
  // Diagnostic indicators
  pneumoniaRisk: number;
  tuberculosisSuspicion: number;
  covidLikelihood: number;
  bronchitisIndicator: number;
  asthmaIndicator: number;

  // Cough characteristics
  type: 'dry' | 'wet' | 'barking' | 'whooping';
  severity: 'mild' | 'moderate' | 'severe';
  pattern: 'single' | 'paroxysmal' | 'continuous';

  // Clinical scores
  clinicalScore: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export class CoughAnalyzer {
  private static instance: CoughAnalyzer;

  static getInstance(): CoughAnalyzer {
    if (!CoughAnalyzer.instance) {
      CoughAnalyzer.instance = new CoughAnalyzer();
    }
    return CoughAnalyzer.instance;
  }

  analyzeCough(features: AudioFeatures): CoughAnalysis {
    const coughChars = features.coughCharacteristics;
    
    // Determine cough type
    const coughType = this.determineCoughType(coughChars);
    
    // Calculate disease probabilities
    const pneumoniaRisk = this.calculatePneumoniaRisk(features);
    const tuberculosisSuspicion = this.calculateTuberculosisSuspicion(features);
    const covidLikelihood = this.calculateCovidLikelihood(features);
    const bronchitisIndicator = this.calculateBronchitisIndicator(features);
    const asthmaIndicator = this.calculateAsthmaIndicator(features);

    // Calculate overall clinical score
    const clinicalScore = this.calculateClinicalScore(
      pneumoniaRisk,
      tuberculosisSuspicion,
      covidLikelihood,
      bronchitisIndicator,
      asthmaIndicator
    );

    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(clinicalScore);

    return {
      pneumoniaRisk,
      tuberculosisSuspicion,
      covidLikelihood,
      bronchitisIndicator,
      asthmaIndicator,
      type: coughType,
      severity: this.determineSeverity(coughChars.intensity, clinicalScore),
      pattern: this.determinePattern(features),
      clinicalScore,
      urgencyLevel,
      confidence: this.calculateConfidence(features)
    };
  }

  private determineCoughType(characteristics: AudioFeatures['coughCharacteristics']): 'dry' | 'wet' | 'barking' | 'whooping' {
    const { harshness, wetness, frequency } = characteristics;

    if (wetness > 0.7) {
      return 'wet';
    } else if (harshness > 0.8 && frequency > 1000) {
      return 'barking';
    } else if (frequency < 500 && harshness > 0.6) {
      return 'whooping';
    } else {
      return 'dry';
    }
  }

  private calculatePneumoniaRisk(features: AudioFeatures): number {
    const { harshness, wetness } = features.coughCharacteristics;
    const crackles = features.respiratoryFeatures.cracklesPresence;
    
    // Pneumonia often presents with wet cough and crackles
    let risk = wetness * 0.6 + crackles * 0.4;
    
    // Adjust based on cough harshness
    if (harshness > 0.5) {
      risk *= 1.2;
    }
    
    return Math.min(1, risk);
  }

  private calculateTuberculosisSuspicion(features: AudioFeatures): number {
    const { duration, intensity } = features.coughCharacteristics;
    
    // TB suspicion based on chronic cough characteristics
    let suspicion = 0;
    
    if (duration > 2.0) { // Longer cough duration
      suspicion += 0.3;
    }
    
    if (intensity > 0.7) { // Intense cough
      suspicion += 0.4;
    }
    
    // Add some random variation for demo
    suspicion += Math.random() * 0.3;
    
    return Math.min(1, suspicion);
  }

  private calculateCovidLikelihood(features: AudioFeatures): number {
    const { harshness, duration } = features.coughCharacteristics;
    
    // COVID often presents with dry, persistent cough
    let likelihood = 0;
    
    if (harshness > 0.6 && duration > 1.5) {
      likelihood = harshness * 0.7 + (duration / 3) * 0.3;
    }
    
    return Math.min(1, likelihood);
  }

  private calculateBronchitisIndicator(features: AudioFeatures): number {
    const { wetness } = features.coughCharacteristics;
    const wheezing = features.respiratoryFeatures.wheezingPresence;
    
    // Bronchitis often has productive cough and wheezing
    return Math.min(1, wetness * 0.5 + wheezing * 0.5);
  }

  private calculateAsthmaIndicator(features: AudioFeatures): number {
    const wheezing = features.respiratoryFeatures.wheezingPresence;
    
    // Asthma indicated by wheezing
    let indicator = wheezing * 0.8;
    
    // Cough-variant asthma consideration
    if (features.coughCharacteristics.duration > 1.0) {
      indicator += 0.2;
    }
    
    return Math.min(1, indicator);
  }

  private calculateClinicalScore(...risks: number[]): number {
    // Weighted average of all risk factors
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // pneumonia, tb, covid, bronchitis, asthma
    let totalWeight = 0;
    let weightedSum = 0;

    risks.forEach((risk, index) => {
      weightedSum += risk * weights[index];
      totalWeight += weights[index];
    });

    return weightedSum / totalWeight;
  }

  private determineUrgencyLevel(clinicalScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (clinicalScore >= 0.8) return 'critical';
    if (clinicalScore >= 0.6) return 'high';
    if (clinicalScore >= 0.3) return 'medium';
    return 'low';
  }

  private determineSeverity(intensity: number, clinicalScore: number): 'mild' | 'moderate' | 'severe' {
    const combinedScore = (intensity + clinicalScore) / 2;
    
    if (combinedScore >= 0.7) return 'severe';
    if (combinedScore >= 0.4) return 'moderate';
    return 'mild';
  }

  private determinePattern(features: AudioFeatures): 'single' | 'paroxysmal' | 'continuous' {
    const zeroCrossingRate = features.zeroCrossingRate;
    
    if (zeroCrossingRate > 0.1) return 'paroxysmal';
    if (features.duration > 5) return 'continuous';
    return 'single';
  }

  private calculateConfidence(features: AudioFeatures): number {
    // Confidence based on audio quality and feature strength
    const qualityScore = features.quality.overallQuality;
    const featureStrength = Math.max(
      features.coughCharacteristics.intensity,
      features.coughCharacteristics.harshness,
      features.respiratoryFeatures.wheezingPresence
    );
    
    return (qualityScore * 0.6 + featureStrength * 0.4);
  }
}
