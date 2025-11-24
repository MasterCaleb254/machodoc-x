export interface PanelStep {
  id: string;
  type: 'sensor_capture' | 'symptom_input' | 'ml_inference' | 'fusion' | 'validation' | 'result';
  sensorType?: 'camera' | 'audio' | 'location';
  captureConfig?: {
    duration?: number;
    qualityThreshold?: number;
    instructions?: string;
    required?: boolean;
  };
  mlModel?: string;
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, any>;
  validationRules?: ValidationRule[];
  timeout?: number;
  retryCount?: number;
}

export interface ValidationRule {
  field: string;
  condition: 'required' | 'min' | 'max' | 'range' | 'pattern';
  value?: any;
  errorMessage: string;
}

export interface PanelConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'respiratory' | 'maternal' | 'child' | 'infection' | 'chronic';
  targetConditions: string[];
  requiredSensors: ('camera' | 'audio' | 'location')[];
  steps: PanelStep[];
  dependencies: string[];
  estimatedDuration: number; // seconds
  confidenceThreshold: number;
  riskLevels: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  clinicalGuidelines: {
    references: string[];
    version: string;
    lastUpdated: number;
  };
}

export interface PanelResult {
  panelId: string;
  sessionId: string;
  patientId: string;
  startTime: number;
  endTime: number;
  status: 'completed' | 'failed' | 'partial';
  steps: {
    [stepId: string]: {
      status: 'completed' | 'failed' | 'skipped';
      output?: any;
      error?: string;
      duration: number;
    };
  };
  results: {
    conditions: any[];
    riskScores: any;
    recommendations: string[];
    urgency: string;
    confidence: number;
  };
  quality: {
    overall: number;
    sensorQuality: Record<string, number>;
    dataCompleteness: number;
  };
}

// Panel configurations for MachoDoc X
export const PANEL_CONFIGS: Map<string, PanelConfig> = new Map([
  [
    'respiratory_rapid',
    {
      id: 'respiratory_rapid',
      name: 'Rapid Respiratory Panel',
      version: '1.0.0',
      description: 'Comprehensive respiratory assessment combining cough analysis, breathing sounds, and vital signs',
      category: 'respiratory',
      targetConditions: [
        'pneumonia',
        'tuberculosis',
        'covid',
        'asthma',
        'bronchitis',
        'influenza'
      ],
      requiredSensors: ['camera', 'audio'],
      estimatedDuration: 180,
      confidenceThreshold: 0.7,
      riskLevels: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.9
      },
      clinicalGuidelines: {
        references: ['WHO IMCI', 'Kenya MOH Respiratory Guidelines'],
        version: '2024.1',
        lastUpdated: 1704067200000
      },
      dependencies: ['cough_classifier', 'facial_landmarks', 'vitals_extractor'],
      steps: [
        {
          id: 'symptom_intake',
          type: 'symptom_input',
          validationRules: [
            {
              field: 'cough_duration',
              condition: 'required',
              errorMessage: 'Cough duration is required'
            },
            {
              field: 'breathing_difficulty',
              condition: 'required',
              errorMessage: 'Breathing difficulty assessment is required'
            }
          ],
          timeout: 120000
        },
        {
          id: 'cough_recording',
          type: 'sensor_capture',
          sensorType: 'audio',
          captureConfig: {
            duration: 10,
            qualityThreshold: 0.6,
            instructions: 'Please cough naturally 3-4 times',
            required: true
          },
          retryCount: 2
        },
        {
          id: 'facial_capture',
          type: 'sensor_capture',
          sensorType: 'camera',
          captureConfig: {
            duration: 5,
            qualityThreshold: 0.7,
            instructions: 'Please keep your face steady and visible',
            required: true
          }
        },
        {
          id: 'cough_analysis',
          type: 'ml_inference',
          mlModel: 'cough_classifier',
          inputMapping: {
            audio_data: '$.steps.cough_recording.output.audio'
          },
          outputMapping: {
            cough_type: '$.type',
            confidence: '$.confidence',
            features: '$.features'
          },
          timeout: 30000
        },
        {
          id: 'vitals_extraction',
          type: 'ml_inference',
          mlModel: 'vitals_extractor',
          inputMapping: {
            video_frames: '$.steps.facial_capture.output.frames'
          },
          outputMapping: {
            heart_rate: '$.vitals.heartRate',
            respiration_rate: '$.vitals.respirationRate',
            hrv: '$.vitals.heartRateVariability'
          }
        },
        {
          id: 'facial_analysis',
          type: 'ml_inference',
          mlModel: 'facial_landmarks',
          inputMapping: {
            image: '$.steps.facial_capture.output.image'
          },
          outputMapping: {
            symmetry: '$.symmetry',
            stroke_risk: '$.strokeAsymmetry',
            vitals: '$.vitals'
          }
        },
        {
          id: 'data_fusion',
          type: 'fusion',
          inputMapping: {
            cough_analysis: '$.steps.cough_analysis.output',
            vitals: '$.steps.vitals_extraction.output',
            facial_analysis: '$.steps.facial_analysis.output',
            symptoms: '$.steps.symptom_intake.output'
          },
          timeout: 45000
        },
        {
          id: 'result_generation',
          type: 'result',
          validationRules: [
            {
              field: 'conditions',
              condition: 'required',
              errorMessage: 'Diagnostic conditions are required'
            },
            {
              field: 'confidence',
              condition: 'min',
              value: 0.1,
              errorMessage: 'Minimum confidence threshold not met'
            }
          ]
        }
      ]
    }
  ],
  [
    'maternal_rapid',
    {
      id: 'maternal_rapid',
      name: 'Rapid Maternal Panel',
      version: '1.0.0',
      description: 'Maternal health assessment focusing on anemia, preeclampsia, and infection risks',
      category: 'maternal',
      targetConditions: [
        'anemia',
        'preeclampsia',
        'gestational_diabetes',
        'urinary_tract_infection',
        'dehydration'
      ],
      requiredSensors: ['camera'],
      estimatedDuration: 150,
      confidenceThreshold: 0.65,
      riskLevels: {
        low: 0.2,
        medium: 0.5,
        high: 0.7,
        critical: 0.85
      },
      clinicalGuidelines: {
        references: ['WHO Maternal Health', 'Kenya MOH Antenatal Guidelines'],
        version: '2024.1',
        lastUpdated: 1704067200000
      },
      dependencies: ['facial_landmarks', 'vitals_extractor'],
      steps: [
        {
          id: 'maternal_symptoms',
          type: 'symptom_input',
          validationRules: [
            {
              field: 'gestational_age',
              condition: 'required',
              errorMessage: 'Gestational age is required'
            },
            {
              field: 'swelling',
              condition: 'required',
              errorMessage: 'Swelling assessment is required'
            }
          ]
        },
        {
          id: 'facial_pallor',
          type: 'sensor_capture',
          sensorType: 'camera',
          captureConfig: {
            duration: 8,
            qualityThreshold: 0.75,
            instructions: 'Please ensure good lighting on your face',
            required: true
          }
        },
        {
          id: 'vitals_monitoring',
          type: 'sensor_capture',
          sensorType: 'camera',
          captureConfig: {
            duration: 30,
            qualityThreshold: 0.6,
            instructions: 'Please remain still for vitals monitoring',
            required: false
          }
        },
        {
          id: 'anemia_assessment',
          type: 'ml_inference',
          mlModel: 'facial_landmarks',
          inputMapping: {
            image: '$.steps.facial_pallor.output.image'
          },
          outputMapping: {
            pallor_score: '$.skinTone.pallorScore',
            symmetry: '$.symmetry'
          }
        },
        {
          id: 'maternal_vitals',
          type: 'ml_inference',
          mlModel: 'vitals_extractor',
          inputMapping: {
            video_frames: '$.steps.vitals_monitoring.output.frames'
          },
          outputMapping: {
            heart_rate: '$.vitals.heartRate',
            blood_pressure: '$.vitals.bloodPressure'
          }
        },
        {
          id: 'maternal_fusion',
          type: 'fusion',
          inputMapping: {
            facial_analysis: '$.steps.anemia_assessment.output',
            vitals: '$.steps.maternal_vitals.output',
            symptoms: '$.steps.maternal_symptoms.output'
          }
        }
      ]
    }
  ],
  [
    'child_danger_signs',
    {
      id: 'child_danger_signs',
      name: 'Child Danger Signs Panel',
      version: '1.0.0',
      description: 'WHO IMCI-based danger sign assessment for children under 5',
      category: 'child',
      targetConditions: [
        'severe_pneumonia',
        'severe_malaria',
        'severe_dehydration',
        'severe_malnutrition',
        'meningitis'
      ],
      requiredSensors: ['camera', 'audio'],
      estimatedDuration: 120,
      confidenceThreshold: 0.6,
      riskLevels: {
        low: 0.2,
        medium: 0.4,
        high: 0.6,
        critical: 0.8
      },
      clinicalGuidelines: {
        references: ['WHO IMCI', 'Kenya MOH Child Health'],

        version: '2024.1',

        lastUpdated: 1704067200000
      },
      dependencies: ['cough_classifier', 'facial_landmarks', 'vitals_extractor'],
      steps: [
        {
          id: 'child_symptoms',
          type: 'symptom_input',
          validationRules: [
            {
              field: 'age_months',
              condition: 'required',
              errorMessage: 'Child age is required'
            },
            {
              field: 'feeding_difficulty',
              condition: 'required',
              errorMessage: 'Feeding assessment is required'
            }
          ]
        },
        {
          id: 'child_breathing',
          type: 'sensor_capture',
          sensorType: 'audio',
          captureConfig: {
            duration: 15,
            qualityThreshold: 0.5,
            instructions: 'Record child breathing sounds',
            required: true
          }
        },
        {
          id: 'child_facial',
          type: 'sensor_capture',
          sensorType: 'camera',
          captureConfig: {
            duration: 10,
            qualityThreshold: 0.6,
            instructions: 'Clear view of child face',
            required: true
          }
        },
        {
          id: 'respiratory_assessment',
          type: 'ml_inference',
          mlModel: 'cough_classifier',
          inputMapping: {
            audio_data: '$.steps.child_breathing.output.audio'
          }
        },
        {
          id: 'hydration_assessment',
          type: 'ml_inference',
          mlModel: 'facial_landmarks',
          inputMapping: {
            image: '$.steps.child_facial.output.image'
          }
        },
        {
          id: 'child_fusion',
          type: 'fusion',
          inputMapping: {
            respiratory: '$.steps.respiratory_assessment.output',
            facial: '$.steps.hydration_assessment.output',
            symptoms: '$.steps.child_symptoms.output'
          }
        }
      ]
    }
  ],
  [
    'infection_rapid',
    {
      id: 'infection_rapid',
      name: 'Rapid Infection Panel',
      version: '1.0.0',
      description: 'Multi-system infection screening including malaria, typhoid, and UTI',
      category: 'infection',
      targetConditions: [
        'malaria',
        'typhoid',
        'urinary_tract_infection',
        'bacterial_infection',
        'viral_infection'
      ],
      requiredSensors: ['camera'],
      estimatedDuration: 90,
      confidenceThreshold: 0.7,
      riskLevels: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.9
      },
      clinicalGuidelines: {
        references: ['WHO Infectious Diseases', 'Kenya MOH Treatment Guidelines'],
        version: '2024.1',
        lastUpdated: 1704067200000
      },
      dependencies: ['facial_landmarks', 'vitals_extractor'],
      steps: [
        {
          id: 'infection_symptoms',
          type: 'symptom_input',
          validationRules: [
            {
              field: 'fever_duration',
              condition: 'required',
              errorMessage: 'Fever duration is required'
            },
            {
              field: 'fever_pattern',
              condition: 'required',
              errorMessage: 'Fever pattern is required'
            }
          ]
        },
        {
          id: 'temperature_scan',
          type: 'sensor_capture',
          sensorType: 'camera',
          captureConfig: {
            duration: 10,
            qualityThreshold: 0.7,
            instructions: 'Forehead temperature scan',
            required: true
          }
        },
        {
          id: 'facial_temperature',
          type: 'ml_inference',
          mlModel: 'facial_landmarks',
          inputMapping: {
            image: '$.steps.temperature_scan.output.image'
          },
          outputMapping: {
            temperature: '$.temperature',
            fever_score: '$.feverPattern'
          }
        },
        {
          id: 'infection_vitals',
          type: 'ml_inference',
          mlModel: 'vitals_extractor',
          inputMapping: {
            video_frames: '$.steps.temperature_scan.output.frames'
          }
        },
        {
          id: 'infection_fusion',
          type: 'fusion',
          inputMapping: {
            temperature: '$.steps.facial_temperature.output',
            vitals: '$.steps.infection_vitals.output',
            symptoms: '$.steps.infection_symptoms.output'
          }
        }
      ]
    }
  ],
  [
    'chronic_conditions',
    {
      id: 'chronic_conditions',
      name: 'Chronic Conditions Panel',
      version: '1.0.0',
      description: 'Long-term condition monitoring for hypertension, diabetes, and anemia',
      category: 'chronic',
      targetConditions: [
        'hypertension',
        'diabetes',
        'anemia',
        'chronic_kidney_disease',
        'heart_disease'
      ],
      requiredSensors: ['camera'],
      estimatedDuration: 60,
      confidenceThreshold: 0.75,
      riskLevels: {
        low: 0.2,
        medium: 0.5,
        high: 0.7,
        critical: 0.85
      },
      clinicalGuidelines: {
        references: ['WHO NCD Guidelines', 'Kenya MOH Chronic Care'],
        version: '2024.1',
        lastUpdated: 1704067200000
      },
      dependencies: ['facial_landmarks', 'vitals_extractor'],
      steps: [
        {
          id: 'chronic_symptoms',
          type: 'symptom_input',
          validationRules: [
            {
              field: 'medication_adherence',
              condition: 'required',
              errorMessage: 'Medication adherence is required'
            },
            {
              field: 'symptom_changes',
              condition: 'required',
              errorMessage: 'Symptom changes assessment is required'
            }
          ]
        },
        {
          id: 'vitals_monitoring',
          type: 'sensor_capture',
          sensorType: 'camera',
          captureConfig: {
            duration: 30,
            qualityThreshold: 0.6,
            instructions: 'Resting vitals monitoring',
            required: true
          }
        },
        {
          id: 'chronic_vitals',
          type: 'ml_inference',
          mlModel: 'vitals_extractor',
          inputMapping: {
            video_frames: '$.steps.vitals_monitoring.output.frames'
          },
          outputMapping: {
            heart_rate: '$.vitals.heartRate',
            blood_pressure: '$.vitals.bloodPressure',
            hrv: '$.vitals.heartRateVariability'
          }
        },
        {
          id: 'chronic_fusion',
          type: 'fusion',
          inputMapping: {
            vitals: '$.steps.chronic_vitals.output',
            symptoms: '$.steps.chronic_symptoms.output',
            patient_history: '$.patientHistory'
          }
        }
      ]
    }
  ]
]);
