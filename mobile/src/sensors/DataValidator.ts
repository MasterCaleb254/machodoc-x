import { SensorData } from './SensorManager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface ValidationRule {
  name: string;
  validate: (data: any) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning';
}

export class DataValidator {
  private static instance: DataValidator;
  private validationRules: Map<string, ValidationRule[]> = new Map();

  static getInstance(): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator();
      DataValidator.instance.initializeRules();
    }
    return DataValidator.instance;
  }

  private initializeRules(): void {
    // Camera validation rules
    this.validationRules.set('camera', [
      {
        name: 'image_quality',
        validate: (data: any) => data.qualityScore > 0.5,
        errorMessage: 'Image quality too low for analysis',
        severity: 'warning'
      },
      {
        name: 'image_size',
        validate: (data: any) => data.width >= 640 && data.height >= 480,
        errorMessage: 'Image resolution too low',
        severity: 'error'
      },
      {
        name: 'image_type',
        validate: (data: any) => ['face', 'skin', 'urine', 'wound'].includes(data.type),
        errorMessage: 'Invalid image type',
        severity: 'error'
      }
    ]);

    // Audio validation rules
    this.validationRules.set('audio', [
      {
        name: 'audio_quality',
        validate: (data: any) => data.features?.quality?.overallQuality > 0.4,
        errorMessage: 'Audio quality too low for analysis',
        severity: 'warning'
      },
      {
        name: 'audio_duration',
        validate: (data: any) => data.recording?.duration >= 1.0,
        errorMessage: 'Audio recording too short',
        severity: 'error'
      },
      {
        name: 'signal_noise_ratio',
        validate: (data: any) => data.features?.quality?.signalToNoiseRatio > 10,
        errorMessage: 'Poor signal-to-noise ratio',
        severity: 'warning'
      }
    ]);

    // Sensor fusion validation rules
    this.validationRules.set('fusion', [
      {
        name: 'timestamp_sync',
        validate: (data: any) => {
          const timestamps = this.extractTimestamps(data);
          return this.areTimestampsSynchronized(timestamps);
        },
        errorMessage: 'Sensor timestamps not synchronized',
        severity: 'warning'
      },
      {
        name: 'minimum_sensors',
        validate: (data: any) => this.countActiveSensors(data) >= 2,
        errorMessage: 'Insufficient sensor data for fusion',
        severity: 'error'
      },
      {
        name: 'data_freshness',
        validate: (data: any) => {
          const currentTime = Date.now();
          const dataTime = data.timestamp;
          return (currentTime - dataTime) < 300000; // 5 minutes
        },
        errorMessage: 'Sensor data is too old',
        severity: 'warning'
      }
    ]);
  }

  async validateSensorData(sensorData: SensorData): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 1.0
    };

    // Validate individual sensors
    if (sensorData.camera) {
      const cameraResult = this.validateSensor('camera', sensorData.camera);
      this.mergeResults(result, cameraResult);
    }

    if (sensorData.audio) {
      const audioResult = this.validateSensor('audio', sensorData.audio);
      this.mergeResults(result, audioResult);
    }

    // Validate fusion readiness
    const fusionResult = this.validateSensor('fusion', sensorData);
    this.mergeResults(result, fusionResult);

    // Calculate overall score
    result.score = this.calculateValidationScore(result);

    return result;
  }

  private validateSensor(sensorType: string, data: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 1.0
    };

    const rules = this.validationRules.get(sensorType) || [];

    for (const rule of rules) {
      try {
        if (!rule.validate(data)) {
          if (rule.severity === 'error') {
            result.errors.push(rule.errorMessage);
            result.isValid = false;
          } else {
            result.warnings.push(rule.errorMessage);
          }
        }
      } catch (error) {
        result.errors.push(`Validation rule ${rule.name} failed: ${error.message}`);
        result.isValid = false;
      }
    }

    result.score = this.calculateValidationScore(result);
    return result;
  }

  private mergeResults(target: ValidationResult, source: ValidationResult): void {
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.isValid = target.isValid && source.isValid;
  }

  private calculateValidationScore(result: ValidationResult): number {
    let score = 1.0;

    // Deduct for errors
    score -= result.errors.length * 0.3;

    // Deduct for warnings
    score -= result.warnings.length * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private extractTimestamps(sensorData: SensorData): number[] {
    const timestamps: number[] = [sensorData.timestamp];

    if (sensorData.camera) {
      timestamps.push(sensorData.camera.timestamp);
    }

    if (sensorData.audio) {
      timestamps.push(sensorData.audio.recording.timestamp);
    }

    return timestamps;
  }

  private areTimestampsSynchronized(timestamps: number[]): boolean {
    if (timestamps.length < 2) return true;

    const maxDifference = 5000; // 5 seconds
    const reference = timestamps[0];

    for (const timestamp of timestamps) {
      if (Math.abs(timestamp - reference) > maxDifference) {
        return false;
      }
    }

    return true;
  }

  private countActiveSensors(sensorData: SensorData): number {
    let count = 0;

    if (sensorData.camera) count++;
    if (sensorData.audio) count++;
    if (sensorData.symptoms) count++;
    if (sensorData.location) count++;

    return count;
  }

  getValidationRules(): Map<string, ValidationRule[]> {
    return new Map(this.validationRules);
  }

  addValidationRule(sensorType: string, rule: ValidationRule): void {
    if (!this.validationRules.has(sensorType)) {
      this.validationRules.set(sensorType, []);
    }
    this.validationRules.get(sensorType)!.push(rule);
  }
}
