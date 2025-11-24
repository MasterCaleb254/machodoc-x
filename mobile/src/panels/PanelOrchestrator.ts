import { EventEmitter } from 'events';
import { PanelConfig, PanelStep, PanelResult } from './PanelConfig';
import { SensorManager } from '../sensors/SensorManager';
import { ModelManager } from '../ml/models/ModelManager';
import { BayesianFusionEngine } from '../ml/fusion/BayesianFusionEngine';
import { DatabaseManager } from '../storage/DatabaseManager';
import { ValidationService } from './ValidationService';

export interface PanelSession {
  id: string;
  panelId: string;
  patientId: string;
  config: PanelConfig;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  startTime: number;
  endTime?: number;
  results: Partial<PanelResult>;
  stepResults: Map<string, any>;
  errors: string[];
  context: any;
}

export interface OrchestratorConfig {
  maxRetries: number;
  timeout: number;
  qualityThreshold: number;
  enableFallbacks: boolean;
  batteryOptimized: boolean;
}

export class PanelOrchestrator extends EventEmitter {
  private static instance: PanelOrchestrator;
  private sensorManager: SensorManager;
  private modelManager: ModelManager;
  private fusionEngine: BayesianFusionEngine;
  private databaseManager: DatabaseManager;
  private validationService: ValidationService;
  private activeSessions: Map<string, PanelSession> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.sensorManager = SensorManager.getInstance();
    this.modelManager = ModelManager.getInstance();
    this.fusionEngine = BayesianFusionEngine.getInstance();
    this.databaseManager = DatabaseManager.getInstance();
    this.validationService = ValidationService.getInstance();
  }

  static getInstance(): PanelOrchestrator {
    if (!PanelOrchestrator.instance) {
      PanelOrchestrator.instance = new PanelOrchestrator();
    }
    return PanelOrchestrator.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.sensorManager.initialize();
      await this.modelManager.initialize();
      await this.fusionEngine.initialize();
      
      this.isInitialized = true;
      console.log('Panel Orchestrator initialized');
    } catch (error) {
      console.error('Failed to initialize Panel Orchestrator:', error);
      throw error;
    }
  }

  async startPanel(
    panelId: string,
    patientId: string,
    context: any = {}
  ): Promise<PanelSession> {
    if (!this.isInitialized) {
      throw new Error('Panel Orchestrator not initialized');
    }

    const config = PANEL_CONFIGS.get(panelId);
    if (!config) {
      throw new Error(`Unknown panel: ${panelId}`);
    }

    // Check dependencies
    await this.validateDependencies(config);

    const sessionId = this.generateSessionId();
    const session: PanelSession = {
      id: sessionId,
      panelId,
      patientId,
      config,
      status: 'initializing',
      currentStep: 0,
      startTime: Date.now(),
      results: {},
      stepResults: new Map(),
      errors: [],
      context
    };

    this.activeSessions.set(sessionId, session);
    
    console.log(`Starting panel session ${sessionId} for ${panelId}`);
    this.emit('sessionStarted', session);

    // Start panel execution
    this.executePanel(session).catch(error => {
      console.error(`Panel execution failed for session ${sessionId}:`, error);
      this.handleSessionError(session, error.message);
    });

    return session;
  }

  private async validateDependencies(config: PanelConfig): Promise<void> {
    const missingDeps: string[] = [];

    // Check ML model dependencies
    for (const modelId of config.dependencies) {
      try {
        await this.modelManager.getModel(modelId);
      } catch {
        missingDeps.push(`ML model: ${modelId}`);
      }
    }

    // Check sensor dependencies
    for (const sensor of config.requiredSensors) {
      const sensorStatus = this.sensorManager.getSensorStatus();
      if (!sensorStatus[sensor as keyof typeof sensorStatus]) {
        missingDeps.push(`Sensor: ${sensor}`);
      }
    }

    if (missingDeps.length > 0) {
      throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
    }
  }

  private async executePanel(session: PanelSession): Promise<void> {
    try {
      session.status = 'running';
      this.emit('sessionStatusChanged', session);

      // Execute each step in sequence
      for (let stepIndex = 0; stepIndex < session.config.steps.length; stepIndex++) {
        if (session.status !== 'running') {
          break; // Session was paused or stopped
        }

        session.currentStep = stepIndex;
        const step = session.config.steps[stepIndex];
        
        this.emit('stepStarted', session, step);
        
        try {
          await this.executeStep(session, step);
          this.emit('stepCompleted', session, step);
        } catch (error) {
          await this.handleStepError(session, step, error);
        }
      }

      if (session.status === 'running') {
        await this.completeSession(session);
      }

    } catch (error) {
      this.handleSessionError(session, error.message);
    }
  }

  private async executeStep(session: PanelSession, step: PanelStep): Promise<void> {
    const startTime = Date.now();
    
    try {
      let output: any;

      switch (step.type) {
        case 'sensor_capture':
          output = await this.executeSensorCapture(session, step);
          break;
        
        case 'symptom_input':
          output = await this.executeSymptomInput(session, step);
          break;
        
        case 'ml_inference':
          output = await this.executeMLInference(session, step);
          break;
        
        case 'fusion':
          output = await this.executeFusion(session, step);
          break;
        
        case 'result':
          output = await this.executeResultGeneration(session, step);
          break;
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Validate step output
      if (step.validationRules) {
        await this.validationService.validateStepOutput(output, step.validationRules);
      }

      // Store step result
      session.stepResults.set(step.id, {
        output,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      });

      this.emit('stepProgress', session, step, output);

    } catch (error) {
      throw new Error(`Step ${step.id} failed: ${error.message}`);
    }
  }

  private async executeSensorCapture(session: PanelSession, step: PanelStep): Promise<any> {
    if (!step.sensorType) {
      throw new Error('Sensor type not specified for capture step');
    }

    const captureConfig = step.captureConfig || {};
    
    try {
      const sensorResult = await this.sensorManager.startSensorSession(
        session.patientId,
        session.panelId,
        {
          enabledSensors: [step.sensorType],
          captureMode: 'sequential',
          qualityThreshold: captureConfig.qualityThreshold || 0.6,
          maxBatteryUsage: 5,
          timeout: captureConfig.duration ? captureConfig.duration * 1000 : 30000
        }
      );

      // Wait for sensor session to complete
      return await this.waitForSensorCompletion(sensorResult.id);

    } catch (error) {
      if (step.retryCount && step.retryCount > 0) {
        console.log(`Retrying sensor capture for step ${step.id}`);
        return await this.executeSensorCapture(session, step);
      }
      throw error;
    }
  }

  private async waitForSensorCompletion(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sensor capture timeout'));
      }, 60000);

      const checkCompletion = () => {
        const session = this.activeSessions.get(sessionId);
        if (session && session.status === 'completed') {
          clearTimeout(timeout);
          resolve(session.results);
        } else if (session && session.status === 'failed') {
          clearTimeout(timeout);
          reject(new Error('Sensor capture failed'));
        }
      };

      // Check every second
      const interval = setInterval(checkCompletion, 1000);
      
      // Also listen for session events
      this.sensorManager.on('sessionCompleted', (completedSession) => {
        if (completedSession.id === sessionId) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(completedSession.data);
        }
      });

      this.sensorManager.on('sessionError', (errorSession, error) => {
        if (errorSession.id === sessionId) {
          clearInterval(interval);
          clearTimeout(timeout);
          reject(new Error(error));
        }
      });
    });
  }

  private async executeSymptomInput(session: PanelSession, step: PanelStep): Promise<any> {
    // This would integrate with UI for symptom input
    // For now, return mock data based on panel type
    return this.generateMockSymptoms(session.panelId);
  }

  private async executeMLInference(session: PanelSession, step: PanelStep): Promise<any> {
    if (!step.mlModel) {
      throw new Error('ML model not specified for inference step');
    }

    // Extract input data using mapping
    const inputData = this.extractStepInput(session, step.inputMapping || {});
    
    // Load model if not already loaded
    const model = await this.modelManager.getModel(step.mlModel);
    
    // Prepare input tensor
    const inputTensor = await this.prepareModelInput(step.mlModel, inputData);
    
    // Run inference
    const inferenceResult = await this.modelManager.runInference(
      step.mlModel,
      inputTensor,
      { warmup: true }
    );

    // Extract output using mapping
    const output = this.extractStepOutput(inferenceResult, step.outputMapping || {});

    // Clean up tensors
    inputTensor.dispose();
    if (inferenceResult.output instanceof tf.Tensor) {
      inferenceResult.output.dispose();
    }

    return output;
  }

  private async executeFusion(session: PanelSession, step: PanelStep): Promise<any> {
    // Extract input data for fusion
    const fusionInput = this.extractStepInput(session, step.inputMapping || {});
    
    // Prepare fusion context
    const context = {
      patientId: session.patientId,
      timestamp: Date.now(),
      location: session.context.location || { county: 'unknown' },
      panelType: session.panelId
    };

    // Execute Bayesian fusion
    const fusionResult = await this.fusionEngine.fuseData({
      sensorData: fusionInput.sensorData || {},
      modelOutputs: fusionInput.modelOutputs || {},
      context
    });

    return fusionResult;
  }

  private async executeResultGeneration(session: PanelSession, step: PanelStep): Promise<any> {
    // Collect all step results
    const allResults = Object.fromEntries(session.stepResults);
    
    // Generate final panel result
    const fusionResult = allResults.data_fusion?.output;
    
    if (!fusionResult) {
      throw new Error('Fusion result not available for result generation');
    }

    const panelResult: PanelResult['results'] = {
      conditions: fusionResult.conditions,
      riskScores: fusionResult.riskScores,
      recommendations: fusionResult.recommendations,
      urgency: fusionResult.urgency,
      confidence: fusionResult.confidence
    };

    // Calculate quality metrics
    const quality = this.calculatePanelQuality(session, allResults);

    session.results = {
      panelId: session.panelId,
      sessionId: session.id,
      patientId: session.patientId,
      startTime: session.startTime,
      endTime: Date.now(),
      status: 'completed',
      steps: this.formatStepResults(session.stepResults),
      results: panelResult,
      quality
    };

    return panelResult;
  }

  private extractStepInput(session: PanelSession, mapping: Record<string, any>): any {
    const input: any = {};
    
    for (const [key, path] of Object.entries(mapping)) {
      input[key] = this.resolveDataPath(session, path);
    }
    
    return input;
  }

  private resolveDataPath(session: PanelSession, path: string): any {
    if (!path.startsWith('$.')) {
      return path; // Literal value
    }

    const pathParts = path.slice(2).split('.');
    let current: any = { steps: Object.fromEntries(session.stepResults) };
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private extractStepOutput(inferenceResult: any, mapping: Record<string, any>): any {
    if (Object.keys(mapping).length === 0) {
      return inferenceResult; // Return raw output if no mapping
    }

    const output: any = {};
    
    for (const [key, path] of Object.entries(mapping)) {
      output[key] = this.resolveOutputPath(inferenceResult, path);
    }
    
    return output;
  }

  private resolveOutputPath(data: any, path: string): any {
    if (!path.startsWith('$.')) {
      return path; // Literal value
    }

    const pathParts = path.slice(2).split('.');
    let current: any = data;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private async prepareModelInput(modelId: string, inputData: any): Promise<any> {
    // This would convert input data to appropriate tensor format
    // Based on the model requirements
    switch (modelId) {
      case 'cough_classifier':
        return this.prepareAudioInput(inputData.audio_data);
      case 'facial_landmarks':
        return this.prepareImageInput(inputData.image);
      case 'vitals_extractor':
        return this.prepareVideoInput(inputData.video_frames);
      default:
        throw new Error(`Unknown model: ${modelId}`);
    }
  }

  private async prepareAudioInput(audioData: any): Promise<any> {
    // Convert audio data to tensor
    // This is a simplified implementation
    return tf.tensor(audioData).expandDims();
  }

  private async prepareImageInput(imageData: any): Promise<any> {
    // Convert image data to tensor
    return tf.tensor(imageData).expandDims();
  }

  private async prepareVideoInput(videoFrames: any): Promise<any> {
    // Convert video frames to tensor
    return tf.tensor(videoFrames).expandDims();
  }

  private async handleStepError(session: PanelSession, step: PanelStep, error: Error): Promise<void> {
    console.error(`Step ${step.id} failed:`, error);
    
    session.errors.push(`Step ${step.id}: ${error.message}`);
    
    if (step.retryCount && step.retryCount > 0) {
      console.log(`Retrying step ${step.id}`);
      step.retryCount--;
      await this.executeStep(session, step);
    } else if (step.captureConfig?.required === false) {
      console.log(`Skipping optional step ${step.id}`);
      session.stepResults.set(step.id, {
        output: null,
        duration: 0,
        timestamp: Date.now(),
        skipped: true
      });
    } else {
      throw error; // Re-throw to trigger session failure
    }
  }

  private async completeSession(session: PanelSession): Promise<void> {
    session.status = 'completed';
    session.endTime = Date.now();

    // Save results to database
    await this.savePanelResults(session.results as PanelResult);

    this.emit('sessionCompleted', session);
    this.activeSessions.delete(session.id);

    console.log(`Panel session ${session.id} completed successfully`);
  }

  private handleSessionError(session: PanelSession, errorMessage: string): void {
    session.status = 'failed';
    session.endTime = Date.now();
    session.errors.push(errorMessage);

    session.results = {
      ...session.results,
      status: 'failed',
      endTime: Date.now(),
      errors: session.errors
    };

    this.emit('sessionFailed', session, errorMessage);
    this.activeSessions.delete(session.id);

    console.error(`Panel session ${session.id} failed:`, errorMessage);
  }

  private calculatePanelQuality(session: PanelSession, allResults: any): PanelResult['quality'] {
    let totalQuality = 0;
    let stepCount = 0;
    const sensorQuality: Record<string, number> = {};

    for (const [stepId, result] of Object.entries(allResults)) {
      if (result.skipped) continue;
      
      // Calculate step quality based on duration, confidence, etc.
      const stepQuality = this.calculateStepQuality(stepId, result);
      totalQuality += stepQuality;
      stepCount++;

      // Track sensor-specific quality
      if (result.output?.qualityScores) {
        Object.assign(sensorQuality, result.output.qualityScores);
      }
    }

    const overallQuality = stepCount > 0 ? totalQuality / stepCount : 0;
    const dataCompleteness = this.calculateDataCompleteness(session);

    return {
      overall: overallQuality,
      sensorQuality,
      dataCompleteness
    };
  }

  private calculateStepQuality(stepId: string, result: any): number {
    // Base quality on execution time and output confidence
    let quality = 0.7; // Base quality
    
    if (result.duration < 10000) {
      quality += 0.2; // Fast execution
    }
    
    if (result.output?.confidence) {
      quality = (quality + result.output.confidence) / 2;
    }
    
    return Math.min(1, quality);
  }

  private calculateDataCompleteness(session: PanelSession): number {
    const totalSteps = session.config.steps.length;
    const completedSteps = Array.from(session.stepResults.values())
      .filter(result => !result.skipped).length;
    
    return completedSteps / totalSteps;
  }

  private formatStepResults(stepResults: Map<string, any>): PanelResult['steps'] {
    const formatted: PanelResult['steps'] = {};
    
    stepResults.forEach((result, stepId) => {
      formatted[stepId] = {
        status: result.skipped ? 'skipped' : 'completed',
        output: result.output,
        error: result.error,
        duration: result.duration
      };
    });
    
    return formatted;
  }

  private generateMockSymptoms(panelId: string): any {
    const mockData: Record<string, any> = {
      respiratory_rapid: {
        cough_duration: 3, // days
        breathing_difficulty: 'moderate',
        fever: true,
        chest_pain: false
      },
      maternal_rapid: {
        gestational_age: 28, // weeks
        swelling: 'mild',
        headaches: false,
        vision_changes: false
      },
      child_danger_signs: {
        age_months: 24,
        feeding_difficulty: 'severe',
        lethargy: true,
        fever_duration: 2
      },
      infection_rapid: {
        fever_duration: 3,
        fever_pattern: 'intermittent',
        chills: true,
        body_aches: true
      },
      chronic_conditions: {
        medication_adherence: 'good',
        symptom_changes: 'worsening',
        weight_changes: 'stable'
      }
    };

    return mockData[panelId] || {};
  }

  private async savePanelResults(results: PanelResult): Promise<void> {
    try {
      await this.databaseManager.createDiagnosticSession({
        patientId: results.patientId,
        panelType: results.panelId,
        sensorData: results,
        featureVector: this.extractFeatureVector(results),
        fusionResult: results.results,
        confidenceScores: {
          overall: results.quality.overall,
          data_completeness: results.quality.dataCompleteness
        }
      });
    } catch (error) {
      console.error('Failed to save panel results:', error);
    }
  }

  private extractFeatureVector(results: PanelResult): any {
    return {
      panel_type: results.panelId,
      step_count: Object.keys(results.steps).length,
      overall_quality: results.quality.overall,
      data_completeness: results.quality.dataCompleteness,
      processing_time: results.endTime! - results.startTime
    };
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `panel_${timestamp}_${random}`;
  }

  // Public API methods
  async getSessionStatus(sessionId: string): Promise<PanelSession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'failed';
      session.endTime = Date.now();
      session.errors.push('Session stopped by user');
      
      this.emit('sessionStopped', session);
      this.activeSessions.delete(sessionId);
    }
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'running') {
      session.status = 'paused';
      this.emit('sessionPaused', session);
    }
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'paused') {
      session.status = 'running';
      this.emit('sessionResumed', session);
      
      // Continue execution from current step
      this.executePanel(session).catch(error => {
        this.handleSessionError(session, error.message);
      });
    }
  }

  getActiveSessions(): PanelSession[] {
    return Array.from(this.activeSessions.values());
  }

  getAvailablePanels(): string[] {
    return Array.from(PANEL_CONFIGS.keys());
  }

  getPanelConfig(panelId: string): PanelConfig | null {
    return PANEL_CONFIGS.get(panelId) || null;
  }
}
