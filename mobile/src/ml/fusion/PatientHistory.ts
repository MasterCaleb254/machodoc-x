import { DatabaseManager } from '../../storage/DatabaseManager';

export interface RiskFactor {
  condition: string;
  multiplier: number;
  source: 'genetic' | 'lifestyle' | 'environmental' | 'previous_diagnosis';
  confidence: number;
}

export interface MedicalHistory {
  conditions: string[];
  medications: string[];
  allergies: string[];
  surgeries: string[];
  familyHistory: string[];
}

export interface PatientRiskProfile {
  patientId: string;
  riskFactors: RiskFactor[];
  medicalHistory: MedicalHistory;
  lastUpdated: number;
  overallRisk: number;
}

export class PatientHistory {
  private static instance: PatientHistory;
  private databaseManager: DatabaseManager;
  private riskProfiles: Map<string, PatientRiskProfile> = new Map();

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
  }

  static getInstance(): PatientHistory {
    if (!PatientHistory.instance) {
      PatientHistory.instance = new PatientHistory();
    }
    return PatientHistory.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load risk profiles from database
      await this.loadRiskProfiles();
      console.log('Patient History service initialized');
    } catch (error) {
      console.error('Failed to initialize Patient History service:', error);
      throw error;
    }
  }

  async getPatientRiskFactors(patientId: string): Promise<PatientRiskProfile> {
    // Check cache first
    if (this.riskProfiles.has(patientId)) {
      return this.riskProfiles.get(patientId)!;
    }

    // Load from database or create default profile
    const profile = await this.loadPatientProfile(patientId);
    this.riskProfiles.set(patientId, profile);
    
    return profile;
  }

  async updatePatientHistory(patientId: string, updates: Partial<MedicalHistory>): Promise<void> {
    try {
      const profile = await this.getPatientRiskFactors(patientId);
      
      // Update medical history
      if (updates.conditions) {
        profile.medicalHistory.conditions = updates.conditions;
      }
      if (updates.medications) {
        profile.medicalHistory.medications = updates.medications;
      }
      if (updates.allergies) {
        profile.medicalHistory.allergies = updates.allergies;
      }
      if (updates.surgeries) {
        profile.medicalHistory.surgeries = updates.surgeries;
      }
      if (updates.familyHistory) {
        profile.medicalHistory.familyHistory = updates.familyHistory;
      }

      // Recalculate risk factors
      await this.calculateRiskFactors(profile);
      
      // Update cache and database
      this.riskProfiles.set(patientId, profile);
      await this.savePatientProfile(profile);

      console.log(`Updated patient history for ${patientId}`);

    } catch (error) {
      console.error('Failed to update patient history:', error);
      throw error;
    }
  }

  async addDiagnosticSession(patientId: string, sessionData: any): Promise<void> {
    try {
      const profile = await this.getPatientRiskFactors(patientId);
      
      // Update risk factors based on new diagnostic data
      await this.updateRiskFromSession(profile, sessionData);
      
      // Update cache and database
      this.riskProfiles.set(patientId, profile);
      await this.savePatientProfile(profile);

    } catch (error) {
      console.error('Failed to add diagnostic session:', error);
    }
  }

  private async loadPatientProfile(patientId: string): Promise<PatientRiskProfile> {
    try {
      // Try to load from database
      const dbProfile = await this.loadFromDatabase(patientId);
      if (dbProfile) {
        return dbProfile;
      }

      // Create default profile
      return await this.createDefaultProfile(patientId);

    } catch (error) {
      console.error('Failed to load patient profile, creating default:', error);
      return await this.createDefaultProfile(patientId);
    }
  }

  private async loadFromDatabase(patientId: string): Promise<PatientRiskProfile | null> {
    // This would load from the local database
    // Return null for now to force default profile creation
    return null;
  }

  private async createDefaultProfile(patientId: string): Promise<PatientRiskProfile> {
    const profile: PatientRiskProfile = {
      patientId,
      riskFactors: [],
      medicalHistory: {
        conditions: [],
        medications: [],
        allergies: [],
        surgeries: [],
        familyHistory: []
      },
      lastUpdated: Date.now(),
      overallRisk: 0.1
    };

    // Calculate initial risk factors
    await this.calculateRiskFactors(profile);
    
    return profile;
  }

  private async calculateRiskFactors(profile: PatientRiskProfile): Promise<void> {
    const riskFactors: RiskFactor[] = [];
    
    // Calculate risk factors based on medical history
    profile.medicalHistory.conditions.forEach(condition => {
      const multiplier = this.getConditionMultiplier(condition);
      riskFactors.push({
        condition,
        multiplier,
        source: 'previous_diagnosis',
        confidence: 0.9
      });
    });

    // Add family history risks
    profile.medicalHistory.familyHistory.forEach(condition => {
      const multiplier = this.getFamilyHistoryMultiplier(condition);
      riskFactors.push({
        condition,
        multiplier,
        source: 'genetic',
        confidence: 0.7
      });
    });

    // Add lifestyle risks (would be based on patient data)
    riskFactors.push({
      condition: 'hypertension',
      multiplier: 1.3,
      source: 'lifestyle',
      confidence: 0.6
    });

    riskFactors.push({
      condition: 'diabetes',
      multiplier: 1.2,
      source: 'lifestyle',
      confidence: 0.5
    });

    profile.riskFactors = riskFactors;
    profile.overallRisk = this.calculateOverallRisk(riskFactors);
  }

  private getConditionMultiplier(condition: string): number {
    const multipliers: { [key: string]: number } = {
      'hypertension': 2.0,
      'diabetes': 2.5,
      'asthma': 1.8,
      'anemia': 1.5,
      'chronic_kidney_disease': 2.2,
      'hiv': 1.7
    };
    
    return multipliers[condition] || 1.5;
  }

  private getFamilyHistoryMultiplier(condition: string): number {
    const multipliers: { [key: string]: number } = {
      'hypertension': 1.5,
      'diabetes': 1.8,
      'heart_disease': 1.7,
      'stroke': 1.6,
      'cancer': 1.4
    };
    
    return multipliers[condition] || 1.3;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0.1;
    
    const weightedSum = riskFactors.reduce((sum, factor) => 
      sum + (factor.multiplier - 1) * factor.confidence, 0
    );
    
    const avgRisk = weightedSum / riskFactors.length;
    return Math.min(0.9, 0.1 + avgRisk * 0.3);
  }

  private async updateRiskFromSession(profile: PatientRiskProfile, sessionData: any): Promise<void> {
    // Update risk factors based on diagnostic session results
    if (sessionData.conditions) {
      sessionData.conditions.forEach((condition: any) => {
        if (condition.probability > 0.7 && !profile.medicalHistory.conditions.includes(condition.condition)) {
          // Add high-probability conditions to history
          profile.medicalHistory.conditions.push(condition.condition);
        }
      });
    }

    // Recalculate risk factors
    await this.calculateRiskFactors(profile);
  }

  private async savePatientProfile(profile: PatientRiskProfile): Promise<void> {
    // Save to local database
    // Implementation would depend on database structure
  }

  private async loadRiskProfiles(): Promise<void> {
    // Load all risk profiles from database
    // For now, just initialize empty cache
    this.riskProfiles.clear();
  }

  getCacheStatus(): { patientCount: number; lastUpdated: number } {
    return {
      patientCount: this.riskProfiles.size,
      lastUpdated: Date.now()
    };
  }

  async clearPatientCache(patientId?: string): Promise<void> {
    if (patientId) {
      this.riskProfiles.delete(patientId);
    } else {
      this.riskProfiles.clear();
    }
  }
}
