import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly } from '@nozbe/watermelondb/decorators';

export interface SensorData {
  audio?: { filePath: string; duration: number; features: any; qualityScore: number };
  image?: { filePath: string; type: 'face' | 'skin' | 'urine' | 'wound'; features: any; qualityScore: number };
  symptoms?: { primary: string[]; secondary: string[]; severity: number; duration: number };
  location?: { latitude: number; longitude: number; accuracy: number };
}

export interface FusionResult {
  conditions: Array<{ name: string; probability: number; confidence: number }>;
  riskScores: { overall: number; hydration: number; infection: number; respiratory: number };
  recommendations: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export default class DiagnosticSession extends Model {
  static table = 'diagnostic_sessions';

  @field('patient_id') patientId!: string;
  @field('panel_type') panelType!: string;

  @json('sensor_data', JSON.parse) sensorData!: SensorData;
  @json('feature_vector', JSON.parse) featureVector!: any;
  @json('fusion_result', JSON.parse) fusionResult!: FusionResult;
  @json('confidence_scores', JSON.parse) confidenceScores!: any;

  @readonly @date('created_at') createdAt!: Date;
  @field('is_synced') isSynced!: boolean;
  @field('sync_failures') syncFailures!: number;

  getUrgencyColor(): string {
    switch (this.fusionResult.urgency) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff8800';
      case 'medium': return '#ffbb33';
      case 'low': return '#00C851';
      default: return '#cccccc';
    }
  }

  getTopCondition(): string {
    return this.fusionResult.conditions.length ? this.fusionResult.conditions[0].name : 'Unknown';
  }

  getConfidenceLevel(): number {
    return this.fusionResult.conditions.length ? this.fusionResult.conditions[0].confidence : 0;
  }
}
