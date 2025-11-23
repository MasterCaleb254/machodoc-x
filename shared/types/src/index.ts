// Core medical types
export interface Patient {
  id: string;
  anonymousId: string;
  basicInfo: BasicPatientInfo;
  medicalHistory: MedicalHistory;
  riskFactors: RiskFactors;
  createdAt: Date;
  updatedAt: Date;
}

export interface BasicPatientInfo {
  age: number;
  gender: 'male' | 'female' | 'other';
  location: GeoLocation;
  weight?: number;
  height?: number;
}

export interface DiagnosticSession {
  id: string;
  patientId: string;
  panelType: DiagnosticPanel;
  sensorData: SensorData;
  featureVector: FeatureVector;
  fusionResult: FusionResult;
  confidenceScores: ConfidenceScores;
  createdAt: Date;
}

export type DiagnosticPanel = 
  | 'respiratory' 
  | 'maternal' 
  | 'child' 
  | 'infection' 
  | 'chronic';

// Sensor data types
export interface SensorData {
  audio?: AudioAnalysis;
  image?: ImageAnalysis;
  symptoms?: SymptomAnalysis;
  location?: GeoData;
}

export interface AudioAnalysis {
  filePath: string;
  duration: number;
  features: AudioFeatures;
  qualityScore: number;
}

export interface ImageAnalysis {
  filePath: string;
  type: 'face' | 'skin' | 'urine' | 'wound';
  features: ImageFeatures;
  qualityScore: number;
}
