import * as tf from '@tensorflow/tfjs';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { EpidemiologyService } from './EpidemiologyService';
import { PatientHistory } from './PatientHistory';

export interface FusionInput {
  sensorData: {
    audio?: any;
    camera?: any;
    symptoms?: any;
    location?: any;
  };
  modelOutputs: {
    cough?: any;
    facial?: any;
    vitals?: any;
    urine?: any;
    skin?: any;
  };
  context: {
    patientId: string;
    timestamp: number;
    location: {
      county: string;
      subCounty?: string;
    };
    panelType: string;
  };
}

export interface ConditionProbability {
  condition: string;
  probability: number;
  confidence: number;
  contributingFactors: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  evidence: {
    source: string;
    strength: number;
    confidence: number;
  }[];
}

export interface FusionResult {
  conditions: ConditionProbability[];
  riskScores: {
    overall: number;
    hydration: number;
    infection: number;
    respiratory: number;
    cardiovascular: number;
  };
  recommendations: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  fusedFeatures: any;
  warnings: string[];
}

export interface BayesianNetwork {
  nodes: Map<string, BayesianNode>;
  edges: Map<string, string[]>;
  priors: Map<string, number>;
}

export interface BayesianNode {
  id: string;
  type: 'condition' | 'symptom' | 'risk_factor' | 'test_result';
  states: string[];
  probabilities: number[][]; // Conditional probability table
  parents: string[];
}

export class BayesianFusionEngine {
  private static instance: BayesianFusionEngine;
  private databaseManager: DatabaseManager;
  private epidemiologyService: EpidemiologyService;
  private patientHistory: PatientHistory;
  private networks: Map<string, BayesianNetwork> = new Map();
  private isInitialized: boolean = false;

  // Disease prevalence priors for Kenya (example data)
  private baselinePriors: Map<string, number> = new Map([
    ['malaria', 0.15],
    ['pneumonia', 0.08],
    ['tuberculosis', 0.05],
    ['covid', 0.03],
    ['urinary_tract_infection', 0.12],
    ['hypertension', 0.25],
    ['diabetes', 0.06],
    ['asthma', 0.09],
    ['anemia', 0.20],
    ['dehydration', 0.10]
  ]);

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.epidemiologyService = EpidemiologyService.getInstance();
    this.patientHistory = PatientHistory.getInstance();
  }

  static getInstance(): BayesianFusionEngine {
    if (!BayesianFusionEngine.instance) {
      BayesianFusionEngine.instance = new BayesianFusionEngine();
    }
    return BayesianFusionEngine.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize services
      await this.epidemiologyService.initialize();
      await this.patientHistory.initialize();

      // Load Bayesian networks for different panels
      await this.loadNetworks();

      this.isInitialized = true;
      console.log('Bayesian Fusion Engine initialized');
    } catch (error) {
      console.error('Failed to initialize Bayesian Fusion Engine:', error);
      throw error;
    }
  }

  private async loadNetworks(): Promise<void> {
    // Load panel-specific Bayesian networks
    const panels = ['respiratory', 'maternal', 'child', 'infection', 'chronic'];
    
    for (const panel of panels) {
      const network = await this.createNetworkForPanel(panel);
      this.networks.set(panel, network);
    }

    console.log(`Loaded ${this.networks.size} Bayesian networks`);
  }

  private async createNetworkForPanel(panelType: string): Promise<BayesianNetwork> {
    // Create panel-specific Bayesian network structure
    switch (panelType) {
      case 'respiratory':
        return this.createRespiratoryNetwork();
      case 'maternal':
        return this.createMaternalNetwork();
      case 'child':
        return this.createChildNetwork();
      case 'infection':
        return this.createInfectionNetwork();
      case 'chronic':
        return this.createChronicNetwork();
      default:
        throw new Error(`Unknown panel type: ${panelType}`);
    }
  }

  private createRespiratoryNetwork(): BayesianNetwork {
    const nodes = new Map<string, BayesianNode>();
    const edges = new Map<string, string[]>();
    const priors = new Map<string, number>();

    // Define nodes for respiratory conditions
    const respiratoryNodes = [
      this.createConditionNode('pneumonia', ['absent', 'mild', 'severe']),
      this.createConditionNode('tuberculosis', ['absent', 'suspected', 'confirmed']),
      this.createConditionNode('covid', ['absent', 'mild', 'severe']),
      this.createConditionNode('asthma', ['absent', 'mild', 'moderate', 'severe']),
      this.createConditionNode('bronchitis', ['absent', 'acute', 'chronic']),
      
      // Symptom nodes
      this.createSymptomNode('cough', ['none', 'dry', 'productive']),
      this.createSymptomNode('fever', ['absent', 'low', 'high']),
      this.createSymptomNode('breathing_difficulty', ['none', 'mild', 'severe']),
      this.createSymptomNode('chest_pain', ['absent', 'present']),
      
      // Test result nodes
      this.createTestNode('cough_analysis', ['normal', 'suspicious', 'pathological']),
      this.createTestNode('respiratory_sounds', ['normal', 'crackles', 'wheezing']),
      this.createTestNode('oxygen_saturation', ['normal', 'low', 'critical']),
      this.createTestNode('facial_symmetry', ['normal', 'mild_asymmetry', 'severe_asymmetry'])
    ];

    // Add nodes to network
    respiratoryNodes.forEach(node => nodes.set(node.id, node));

    // Define edges (conditional dependencies)
    edges.set('pneumonia', ['cough', 'fever', 'breathing_difficulty', 'cough_analysis', 'respiratory_sounds']);
    edges.set('tuberculosis', ['cough', 'fever', 'cough_analysis']);
    edges.set('covid', ['cough', 'fever', 'breathing_difficulty', 'cough_analysis']);
    edges.set('asthma', ['breathing_difficulty', 'respiratory_sounds']);
    edges.set('bronchitis', ['cough', 'respiratory_sounds']);

    // Set baseline priors
    priors.set('pneumonia', 0.08);
    priors.set('tuberculosis', 0.05);
    priors.set('covid', 0.03);
    priors.set('asthma', 0.09);
    priors.set('bronchitis', 0.07);

    return { nodes, edges, priors };
  }

  private createMaternalNetwork(): BayesianNetwork {
    const nodes = new Map<string, BayesianNode>();
    const edges = new Map<string, string[]>();
    const priors = new Map<string, number>();

    // Maternal health nodes
    const maternalNodes = [
      this.createConditionNode('anemia', ['absent', 'mild', 'severe']),
      this.createConditionNode('preeclampsia', ['absent', 'mild', 'severe']),
      this.createConditionNode('gestational_diabetes', ['absent', 'present']),
      this.createConditionNode('urinary_tract_infection', ['absent', 'present']),
      
      // Symptom nodes
      this.createSymptomNode('fatigue', ['none', 'mild', 'severe']),
      this.createSymptomNode('swelling', ['none', 'mild', 'severe']),
      this.createSymptomNode('headache', ['absent', 'present']),
      this.createSymptomNode('vision_changes', ['absent', 'present']),
      
      // Test result nodes
      this.createTestNode('facial_pallor', ['normal', 'mild', 'severe']),
      this.createTestNode('blood_pressure', ['normal', 'elevated', 'severe']),
      this.createTestNode('urine_protein', ['negative', 'trace', 'positive']),
      this.createTestNode('blood_glucose', ['normal', 'elevated'])
    ];

    maternalNodes.forEach(node => nodes.set(node.id, node));

    edges.set('anemia', ['fatigue', 'facial_pallor']);
    edges.set('preeclampsia', ['swelling', 'headache', 'vision_changes', 'blood_pressure', 'urine_protein']);
    edges.set('gestational_diabetes', ['blood_glucose']);
    edges.set('urinary_tract_infection', ['urine_protein']);

    priors.set('anemia', 0.20);
    priors.set('preeclampsia', 0.08);
    priors.set('gestational_diabetes', 0.10);
    priors.set('urinary_tract_infection', 0.15);

    return { nodes, edges, priors };
  }

  private createChildNetwork(): BayesianNetwork {
    const nodes = new Map<string, BayesianNode>();
    const edges = new Map<string, string[]>();
    const priors = new Map<string, number>();

    // Child health nodes based on WHO IMCI guidelines
    const childNodes = [
      this.createConditionNode('pneumonia', ['absent', 'mild', 'severe']),
      this.createConditionNode('malaria', ['absent', 'uncomplicated', 'severe']),
      this.createConditionNode('dehydration', ['absent', 'some', 'severe']),
      this.createConditionNode('malnutrition', ['absent', 'moderate', 'severe']),
      this.createConditionNode('diarrhea', ['absent', 'acute', 'persistent']),
      
      // Symptom nodes
      this.createSymptomNode('cough', ['none', 'present']),
      this.createSymptomNode('fever', ['absent', 'present']),
      this.createSymptomNode('lethargy', ['absent', 'present']),
      this.createSymptomNode('feeding_difficulty', ['none', 'some', 'severe']),
      this.createSymptomNode('skin_turgor', ['normal', 'slow', 'very_slow']),
      
      // Test result nodes
      this.createTestNode('respiratory_rate', ['normal', 'fast', 'very_fast']),
      this.createTestNode('weight_for_age', ['normal', 'low', 'very_low']),
      this.createTestNode('temperature', ['normal', 'fever', 'high_fever'])
    ];

    childNodes.forEach(node => nodes.set(node.id, node));

    edges.set('pneumonia', ['cough', 'respiratory_rate', 'lethargy']);
    edges.set('malaria', ['fever', 'lethargy']);
    edges.set('dehydration', ['skin_turgor', 'feeding_difficulty']);
    edges.set('malnutrition', ['weight_for_age', 'feeding_difficulty']);
    edges.set('diarrhea', ['feeding_difficulty']);

    priors.set('pneumonia', 0.12);
    priors.set('malaria', 0.18);
    priors.set('dehydration', 0.15);
    priors.set('malnutrition', 0.10);
    priors.set('diarrhea', 0.20);

    return { nodes, edges, priors };
  }

  private createInfectionNetwork(): BayesianNetwork {
    const nodes = new Map<string, BayesianNode>();
    const edges = new Map<string, string[]>();
    const priors = new Map<string, number>();

    const infectionNodes = [
      this.createConditionNode('malaria', ['absent', 'uncomplicated', 'severe']),
      this.createConditionNode('typhoid', ['absent', 'suspected', 'confirmed']),
      this.createConditionNode('urinary_tract_infection', ['absent', 'present']),
      this.createConditionNode('bacterial_infection', ['absent', 'localized', 'systemic']),
      this.createConditionNode('viral_infection', ['absent', 'mild', 'severe']),
      
      // Symptom nodes
      this.createSymptomNode('fever', ['absent', 'low', 'high']),
      this.createSymptomNode('chills', ['absent', 'present']),
      this.createSymptomNode('body_aches', ['none', 'mild', 'severe']),
      this.createSymptomNode('urinary_symptoms', ['none', 'mild', 'severe']),
      
      // Test result nodes
      this.createTestNode('facial_temperature', ['normal', 'elevated', 'high']),
      this.createTestNode('urine_analysis', ['normal', 'abnormal']),
      this.createTestNode('skin_condition', ['normal', 'rash', 'infection'])
    ];

    infectionNodes.forEach(node => nodes.set(node.id, node));

    edges.set('malaria', ['fever', 'chills', 'body_aches', 'facial_temperature']);
    edges.set('typhoid', ['fever', 'body_aches']);
    edges.set('urinary_tract_infection', ['urinary_symptoms', 'urine_analysis']);
    edges.set('bacterial_infection', ['fever', 'skin_condition']);
    edges.set('viral_infection', ['fever', 'body_aches']);

    priors.set('malaria', 0.15);
    priors.set('typhoid', 0.07);
    priors.set('urinary_tract_infection', 0.12);
    priors.set('bacterial_infection', 0.08);
    priors.set('viral_infection', 0.10);

    return { nodes, edges, priors };
  }

  private createChronicNetwork(): BayesianNetwork {
    const nodes = new Map<string, BayesianNode>();
    const edges = new Map<string, string[]>();
    const priors = new Map<string, number>();

    const chronicNodes = [
      this.createConditionNode('hypertension', ['absent', 'stage1', 'stage2']),
      this.createConditionNode('diabetes', ['absent', 'prediabetes', 'diabetes']),
      this.createConditionNode('anemia', ['absent', 'mild', 'severe']),
      this.createConditionNode('chronic_kidney_disease', ['absent', 'early', 'advanced']),
      
      // Symptom nodes
      this.createSymptomNode('fatigue', ['none', 'mild', 'severe']),
      this.createSymptomNode('swelling', ['none', 'mild', 'severe']),
      this.createSymptomNode('thirst', ['normal', 'increased']),
      this.createSymptomNode('urination', ['normal', 'increased']),
      
      // Test result nodes
      this.createTestNode('blood_pressure', ['normal', 'elevated', 'high']),
      this.createTestNode('blood_glucose', ['normal', 'elevated', 'high']),
      this.createTestNode('facial_pallor', ['normal', 'mild', 'severe']),
      this.createTestNode('urine_protein', ['negative', 'trace', 'positive'])
    ];

    chronicNodes.forEach(node => nodes.set(node.id, node));

    edges.set('hypertension', ['blood_pressure']);
    edges.set('diabetes', ['blood_glucose', 'thirst', 'urination']);
    edges.set('anemia', ['fatigue', 'facial_pallor']);
    edges.set('chronic_kidney_disease', ['swelling', 'urine_protein']);

    priors.set('hypertension', 0.25);
    priors.set('diabetes', 0.06);
    priors.set('anemia', 0.20);
    priors.set('chronic_kidney_disease', 0.05);

    return { nodes, edges, priors };
  }

  private createConditionNode(id: string, states: string[]): BayesianNode {
    return {
      id,
      type: 'condition',
      states,
      probabilities: this.generateConditionProbabilities(states.length),
      parents: []
    };
  }

  private createSymptomNode(id: string, states: string[]): BayesianNode {
    return {
      id,
      type: 'symptom',
      states,
      probabilities: this.generateSymptomProbabilities(states.length),
      parents: []
    };
  }

  private createTestNode(id: string, states: string[]): BayesianNode {
    return {
      id,
      type: 'test_result',
      states,
      probabilities: this.generateTestProbabilities(states.length),
      parents: []
    };
  }

  private generateConditionProbabilities(stateCount: number): number[][] {
    // Generate conditional probability table for conditions
    const probabilities: number[][] = [];
    
    // Simple uniform distribution for demo

  private generateSymptomProbabilities(stateCount: number): number[][] {
    // Symptoms have more complex probability distributions
    const probabilities: number[][] = [];
    
    for (let i = 0; i < stateCount; i++) {
      const row = new Array(stateCount).fill(0.1); // Some baseline probability
      row[i] = 0.8; // Higher probability for matching state
      probabilities.push(this.normalizeProbabilities(row));
    }
    
    return probabilities;
  }

  private generateTestProbabilities(stateCount: number): number[][] {
    // Test results have high accuracy
    const probabilities: number[][] = [];
    
    for (let i = 0; i < stateCount; i++) {
      const row = new Array(stateCount).fill(0.05); // Low probability for incorrect results
      row[i] = 0.85; // High probability for correct results
      probabilities.push(this.normalizeProbabilities(row));
    }
    
    return probabilities;
  }

  private normalizeProbabilities(probabilities: number[]): number[] {
    const sum = probabilities.reduce((a, b) => a + b, 0);
    return probabilities.map(p => p / sum);
  }

  async fuseData(input: FusionInput): Promise<FusionResult> {
    if (!this.isInitialized) {
      throw new Error('Bayesian Fusion Engine not initialized');
    }

    try {
      const network = this.networks.get(input.context.panelType);
      if (!network) {
        throw new Error(`No Bayesian network found for panel: ${input.context.panelType}`);
      }

      // Update priors based on location and epidemiology
      const updatedNetwork = await this.updatePriorsWithEpidemiology(network, input.context.location);
      
      // Update with patient history
      const patientAdjustedNetwork = await this.updateWithPatientHistory(updatedNetwork, input.context.patientId);
      
      // Process sensor data and model outputs
      const evidence = this.extractEvidence(input);
      
      // Perform Bayesian inference
      const posteriorProbabilities = await this.performInference(patientAdjustedNetwork, evidence);
      
      // Generate fusion result
      const result = await this.generateFusionResult(posteriorProbabilities, input, evidence);
      
      return result;

    } catch (error) {
      console.error('Data fusion failed:', error);
      throw error;
    }
  }

  private async updatePriorsWithEpidemiology(network: BayesianNetwork, location: any): Promise<BayesianNetwork> {
    const updatedNetwork = { ...network };
    const epidemiology = await this.epidemiologyService.getCurrentPrevalence(location.county);
    
    // Adjust priors based on local disease prevalence
    for (const [condition, baselinePrior] of network.priors) {
      const localPrevalence = epidemiology.get(condition) || baselinePrior;
      
      // Blend baseline prior with local prevalence
      const adjustedPrior = this.blendPriors(baselinePrior, localPrevalence, 0.7);
      updatedNetwork.priors.set(condition, adjustedPrior);
    }
    
    return updatedNetwork;
  }

  private async updateWithPatientHistory(network: BayesianNetwork, patientId: string): Promise<BayesianNetwork> {
    const updatedNetwork = { ...network };
    const history = await this.patientHistory.getPatientRiskFactors(patientId);
    
    // Adjust priors based on patient history
    for (const [condition, currentPrior] of network.priors) {
      const riskFactor = history.riskFactors.find(rf => rf.condition === condition);
      
      if (riskFactor) {
        // Increase prior probability if patient has risk factors
        const adjustedPrior = Math.min(1, currentPrior * riskFactor.multiplier);
        updatedNetwork.priors.set(condition, adjustedPrior);
      }
    }
    
    return updatedNetwork;
  }

  private extractEvidence(input: FusionInput): Map<string, number> {
    const evidence = new Map<string, number>();
    
    // Extract evidence from sensor data and model outputs
    if (input.modelOutputs.cough) {
      evidence.set('cough_analysis', this.mapCoughToEvidence(input.modelOutputs.cough));
      evidence.set('cough', this.mapCoughTypeToEvidence(input.modelOutputs.cough.type));
    }
    
    if (input.modelOutputs.facial) {
      evidence.set('facial_symmetry', this.mapSymmetryToEvidence(input.modelOutputs.facial.symmetry.face));
      evidence.set('facial_pallor', this.mapPallorToEvidence(input.modelOutputs.facial.skinTone?.pallorScore));
      evidence.set('facial_temperature', this.mapTemperatureToEvidence(input.modelOutputs.facial.temperature));
    }
    
    if (input.modelOutputs.vitals) {
      evidence.set('oxygen_saturation', this.mapOxygenToEvidence(input.modelOutputs.vitals.oxygenSaturation));
      evidence.set('respiratory_rate', this.mapRespiratoryRateToEvidence(input.modelOutputs.vitals.respirationRate));
      evidence.set('blood_pressure', this.mapBloodPressureToEvidence(input.modelOutputs.vitals.bloodPressure));
    }
    
    if (input.modelOutputs.urine) {
      evidence.set('urine_analysis', this.mapUrineToEvidence(input.modelOutputs.urine.parameters));
      evidence.set('urine_protein', this.mapProteinToEvidence(input.modelOutputs.urine.parameters.protein));
    }
    
    if (input.modelOutputs.skin) {
      evidence.set('skin_condition', this.mapSkinToEvidence(input.modelOutputs.skin.primaryCondition));
    }
    
    if (input.sensorData.symptoms) {
      // Extract symptom evidence
      Object.entries(input.sensorData.symptoms).forEach(([symptom, value]) => {
        evidence.set(symptom, this.mapSymptomToEvidence(symptom, value));
      });
    }
    
    return evidence;
  }

  private mapCoughToEvidence(coughAnalysis: any): number {
    // Map cough analysis to evidence strength
    if (!coughAnalysis) return 0.5;
    
    const confidence = coughAnalysis.confidence || 0.5;
    const severity = coughAnalysis.severity === 'severe' ? 0.9 : 
                    coughAnalysis.severity === 'moderate' ? 0.7 : 0.5;
    
    return (confidence + severity) / 2;
  }

  private mapSymmetryToEvidence(symmetryScore: number): number {
    // Lower symmetry indicates higher evidence of abnormality
    return 1 - symmetryScore;
  }

  private mapPallorToEvidence(pallorScore: number): number {
    // Higher pallor score indicates stronger evidence of anemia
    return pallorScore || 0.5;
  }

  private mapTemperatureToEvidence(temperature: any): number {
    if (!temperature) return 0.5;
    const feverScore = temperature.averageTemperature > 0.7 ? 0.8 : 0.3;
    return feverScore;
  }

  private mapRespiratoryRateToEvidence(rate: number): number {
    if (!rate) return 0.5;
    // Evidence of abnormality increases with deviation from normal (12-20)
    if (rate > 24 || rate < 12) return 0.9;
    if (rate > 20 || rate < 14) return 0.7;
    return 0.3;
  }

  private mapUrineToEvidence(parameters: any): number {
    if (!parameters) return 0.5;
    
    // Combine multiple abnormal parameters
    const abnormalParams = Object.values(parameters).filter((p: any) => 
      typeof p === 'number' && p > 0.3
    ).length;
    
    return Math.min(1, abnormalParams * 0.3);
  }

  private mapSymptomToEvidence(symptom: string, value: any): number {
    // Map symptom presence to evidence strength
    if (value === true || value === 'present') return 0.8;
    if (value === false || value === 'absent') return 0.2;
    if (typeof value === 'number') return value;
    return 0.5;
  }

  private async performInference(network: BayesianNetwork, evidence: Map<string, number>): Promise<Map<string, number>> {
    const posteriorProbabilities = new Map<string, number>();
    
    // Simplified Bayesian inference using noisy-OR model
    for (const [condition, prior] of network.priors) {
      let posterior = prior;
      
      // Get connected evidence nodes
      const connectedEvidence = Array.from(evidence.entries()).filter(([nodeId]) => {
        const edges = network.edges.get(condition) || [];
        return edges.includes(nodeId);
      });
      
      // Update probability using evidence
      for (const [evidenceNode, evidenceStrength] of connectedEvidence) {
        const likelihood = this.calculateLikelihood(network, condition, evidenceNode, evidenceStrength);
        posterior = this.bayesUpdate(posterior, likelihood);
      }
      
      posteriorProbabilities.set(condition, posterior);
    }
    
    return posteriorProbabilities;
  }

  private calculateLikelihood(network: BayesianNetwork, condition: string, evidenceNode: string, evidenceStrength: number): number {
    // Calculate likelihood P(evidence|condition)
    const node = network.nodes.get(evidenceNode);
    if (!node) return 0.5;
    
    // Simplified likelihood calculation
    // In a full implementation, this would use the conditional probability tables
    const baseLikelihood = 0.7; // Base likelihood when condition is present
    const baseFalsePositive = 0.1; // Base likelihood when condition is absent
    
    // Adjust based on evidence strength
    const adjustedLikelihood = baseLikelihood * evidenceStrength + 0.3 * (1 - evidenceStrength);
    const adjustedFalsePositive = baseFalsePositive * evidenceStrength + 0.4 * (1 - evidenceStrength);
    
    return evidenceStrength > 0.5 ? adjustedLikelihood : adjustedFalsePositive;
  }

  private bayesUpdate(prior: number, likelihood: number): number {
    // Simple Bayes rule update
    const priorOdds = prior / (1 - prior);
    const likelihoodRatio = likelihood / (1 - likelihood);
    const posteriorOdds = priorOdds * likelihoodRatio;
    return posteriorOdds / (1 + posteriorOdds);
  }

  private blendPriors(prior1: number, prior2: number, weight: number): number {
    return prior1 * weight + prior2 * (1 - weight);
  }

  private async generateFusionResult(
    probabilities: Map<string, number>,
    input: FusionInput,
    evidence: Map<string, number>
  ): Promise<FusionResult> {
    // Convert probabilities to condition list
    const conditions: ConditionProbability[] = Array.from(probabilities.entries())
      .map(([condition, probability]) => this.createConditionProbability(condition, probability, evidence))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10); // Top 10 conditions

    // Calculate risk scores
    const riskScores = this.calculateRiskScores(conditions, input);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(conditions, riskScores);
    
    // Determine urgency
    const urgency = this.determineUrgency(conditions, riskScores);
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(conditions, evidence);
    
    // Generate warnings
    const warnings = this.generateWarnings(conditions, riskScores);

    return {
      conditions,
      riskScores,
      recommendations,
      urgency,
      confidence,
      fusedFeatures: this.generateFusedFeatures(evidence),
      warnings
    };
  }

  private createConditionProbability(
    condition: string,
    probability: number,
    evidence: Map<string, number>
  ): ConditionProbability {
    const contributingFactors = Array.from(evidence.entries())
      .filter(([nodeId, strength]) => strength > 0.6)
      .map(([nodeId]) => nodeId)
      .slice(0, 3);

    const evidenceList = contributingFactors.map(factor => ({
      source: factor,
      strength: evidence.get(factor) || 0.5,
      confidence: 0.8 // Would be calculated from sensor quality
    }));

    const riskLevel = probability > 0.8 ? 'critical' :
                     probability > 0.6 ? 'high' :
                     probability > 0.3 ? 'medium' : 'low';

    return {
      condition,
      probability,
      confidence: this.calculateConditionConfidence(probability, evidenceList),
      contributingFactors,
      riskLevel,
      evidence: evidenceList
    };
  }

  private calculateConditionConfidence(probability: number, evidence: any[]): number {
    if (evidence.length === 0) return 0.1;
    
    const avgEvidenceStrength = evidence.reduce((sum, e) => sum + e.strength, 0) / evidence.length;
    const evidenceCountFactor = Math.min(1, evidence.length / 3);
    
    return (probability * 0.6 + avgEvidenceStrength * 0.3 + evidenceCountFactor * 0.1);
  }

  private calculateRiskScores(conditions: ConditionProbability[], input: FusionInput): FusionResult['riskScores'] {
    const respiratoryConditions = conditions.filter(c => 
      ['pneumonia', 'covid', 'asthma', 'bronchitis', 'tuberculosis'].includes(c.condition)
    );
    
    const infectionConditions = conditions.filter(c => 
      ['malaria', 'typhoid', 'urinary_tract_infection', 'bacterial_infection', 'viral_infection'].includes(c.condition)
    );

    const overallRisk = Math.max(...conditions.map(c => c.probability));
    const respiratoryRisk = respiratoryConditions.length > 0 ? 
      Math.max(...respiratoryConditions.map(c => c.probability)) : 0;
    const infectionRisk = infectionConditions.length > 0 ?
      Math.max(...infectionConditions.map(c => c.probability)) : 0;

    // Calculate hydration risk from vitals and symptoms
    const hydrationRisk = this.calculateHydrationRisk(input);
    const cardiovascularRisk = this.calculateCardiovascularRisk(input);

    return {
      overall: overallRisk,
      hydration: hydrationRisk,
      infection: infectionRisk,
      respiratory: respiratoryRisk,
      cardiovascular: cardiovascularRisk
    };
  }

  private calculateHydrationRisk(input: FusionInput): number {
    let risk = 0;
    
    if (input.modelOutputs.vitals) {
      // High heart rate and low HRV can indicate dehydration
      if (input.modelOutputs.vitals.heartRate > 100) risk += 0.3;
      if (input.modelOutputs.vitals.heartRateVariability < 20) risk += 0.2;
    }
    
    if (input.modelOutputs.facial) {
      // Skin pallor and dry mouth can indicate dehydration
      if (input.modelOutputs.facial.skinTone?.pallorScore > 0.6) risk += 0.3;
      if (input.modelOutputs.facial.facialFeatures?.mouthOpenness < 0.3) risk += 0.2;
    }
    
    return Math.min(1, risk);
  }

  private calculateCardiovascularRisk(input: FusionInput): number {
    let risk = 0;
    
    if (input.modelOutputs.vitals) {
      if (input.modelOutputs.vitals.heartRate > 120 || input.modelOutputs.vitals.heartRate < 50) risk += 0.4;
      if (input.modelOutputs.vitals.heartRateVariability < 15) risk += 0.3;
    }
    
    if (input.modelOutputs.facial) {
      if (input.modelOutputs.facial.strokeAsymmetry > 0.7) risk += 0.3;
    }
    
    return Math.min(1, risk);
  }

  private generateRecommendations(conditions: ConditionProbability[], riskScores: any): string[] {
    const recommendations: string[] = [];
    
    // Critical conditions get immediate action recommendations
    const criticalConditions = conditions.filter(c => c.riskLevel === 'critical');
    if (criticalConditions.length > 0) {
      recommendations.push('Seek immediate medical attention');
      recommendations.push('Consider emergency referral');
    }
    
    // High probability conditions get specific recommendations
    const highProbConditions = conditions.filter(c => c.probability > 0.6);
    highProbConditions.forEach(condition => {
      recommendations.push(`Further testing recommended for ${condition.condition}`);
    });
    
    // Risk-based recommendations
    if (riskScores.respiratory > 0.7) {
      recommendations.push('Monitor breathing and oxygen levels closely');
    }
    
    if (riskScores.infection > 0.7) {
      recommendations.push('Consider laboratory confirmation of infection');
    }
    
    if (riskScores.hydration > 0.6) {
      recommendations.push('Increase fluid intake and monitor hydration status');
    }
    
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private determineUrgency(conditions: ConditionProbability[], riskScores: any): FusionResult['urgency'] {
    // Check for critical conditions
    const criticalConditions = conditions.filter(c => c.riskLevel === 'critical');
    if (criticalConditions.length > 0) return 'critical';
    
    // Check for high-risk conditions
    const highRiskConditions = conditions.filter(c => c.riskLevel === 'high');
    if (highRiskConditions.length > 0 || riskScores.overall > 0.7) return 'high';
    
    // Check for medium-risk conditions
    const mediumRiskConditions = conditions.filter(c => c.riskLevel === 'medium');
    if (mediumRiskConditions.length > 0 || riskScores.overall > 0.4) return 'medium';
    
    return 'low';
  }

  private calculateOverallConfidence(conditions: ConditionProbability[], evidence: Map<string, number>): number {
    if (conditions.length === 0) return 0.1;
    
    const avgConditionConfidence = conditions.reduce((sum, c) => sum + c.confidence, 0) / conditions.length;
    const evidenceCount = evidence.size;
    const evidenceStrength = Array.from(evidence.values()).reduce((sum, strength) => sum + strength, 0) / evidenceCount;
    
    return (avgConditionConfidence * 0.6 + evidenceStrength * 0.3 + Math.min(1, evidenceCount / 5) * 0.1);
  }

  private generateWarnings(conditions: ConditionProbability[], riskScores: any): string[] {
    const warnings: string[] = [];
    
    if (riskScores.overall > 0.8) {
      warnings.push('High overall risk detected - immediate assessment recommended');
    }
    
    if (riskScores.respiratory > 0.7) {
      warnings.push('Respiratory distress risk - monitor breathing carefully');
    }
    
    if (riskScores.infection > 0.7) {
      warnings.push('Possible severe infection - consider antibiotic therapy');
    }
    
    const strokeRisk = conditions.find(c => c.condition === 'stroke');
    if (strokeRisk && strokeRisk.probability > 0.6) {
      warnings.push('Stroke suspicion - urgent neurological assessment needed');
    }
    
    return warnings;
  }

  private generateFusedFeatures(evidence: Map<string, number>): any {
    // Create a fused feature vector for machine learning
    const features: any = {};
    
    evidence.forEach((strength, nodeId) => {
      features[nodeId] = strength;
    });
    
    return features;
  }

  async getNetworkStatus(panelType: string): Promise<any> {
    const network = this.networks.get(panelType);
    if (!network) return null;
    
    return {
      nodeCount: network.nodes.size,
      edgeCount: Array.from(network.edges.values()).reduce((sum, edges) => sum + edges.length, 0),
      conditions: Array.from(network.priors.keys()),
      lastUpdated: Date.now()
    };
  }

  async clearCache(): Promise<void> {
    this.networks.clear();
    await this.loadNetworks();
  }
}
