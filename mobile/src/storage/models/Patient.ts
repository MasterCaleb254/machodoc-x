import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

export interface BasicPatientInfo {
  age: number;
  gender: 'male' | 'female' | 'other';
  location: { county: string; subCounty?: string; village?: string };
  weight?: number;
  height?: number;
}

export interface MedicalHistory {
  conditions: string[];
  medications: string[];
  allergies: string[];
  surgeries: string[];
  lastCheckup?: Date;
}

export interface RiskFactors {
  smoking: boolean;
  alcohol: boolean;
  diet: 'poor' | 'average' | 'good';
  exercise: 'sedentary' | 'light' | 'moderate' | 'active';
  geneticRisks: string[];
}

export default class Patient extends Model {
  static table = 'patients';

  @field('anonymous_id') anonymousId!: string;

  @json('basic_info', JSON.parse) basicInfo!: BasicPatientInfo;
  @json('medical_history', JSON.parse) medicalHistory!: MedicalHistory;
  @json('risk_factors', JSON.parse) riskFactors!: RiskFactors;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('is_synced') isSynced!: boolean;
  @field('encryption_version') encryptionVersion!: string;

  async getAge(): Promise<number> {
    return this.basicInfo.age;
  }

  async getLocation(): Promise<string> {
    return this.basicInfo.location.county;
  }

  async anonymizeForMesh(): Promise<{
    anonymousId: string;
    ageGroup: string;
    gender: string;
    county: string;
    conditions: string[];
  }> {
    const ageGroup = this.basicInfo.age < 18 ? 'child' :
                     this.basicInfo.age < 60 ? 'adult' : 'senior';
    return {
      anonymousId: this.anonymousId,
      ageGroup,
      gender: this.basicInfo.gender,
      county: this.basicInfo.location.county,
      conditions: this.medicalHistory.conditions,
    };
  }
}
