import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { usePanelOrchestrator } from '../hooks/usePanelOrchestrator';
import { SensorCaptureStep } from './SensorCaptureStep';
import { SymptomInputStep } from './SymptomInputStep';
import { LoadingStep } from './LoadingStep';
import { ResultsStep } from './ResultsStep';
import { PanelProgress } from './PanelProgress';

interface ChildPanelProps {
  patientId: string;
  onComplete: (results: any) => void;
  onCancel: () => void;
}

export const ChildPanel: React.FC<ChildPanelProps> = ({
  patientId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [symptoms, setSymptoms] = useState({
    age_months: '',
    feeding_difficulty: 'none',
    lethargy: false,
    fever_duration: '',
    vomiting: false,
    diarrhea: false
  });

  const {
    startPanel,
    currentSession,
    error
  } = usePanelOrchestrator();

  const panelId = 'child_danger_signs';
  const steps = [
    { id: 'child_symptoms', title: 'Child Symptoms', type: 'symptom_input' },
    { id: 'child_breathing', title: 'Breathing Assessment', type: 'sensor_capture' },
    { id: 'child_facial', title: 'Facial Assessment', type: 'sensor_capture' },
    { id: 'analysis', title: 'Analysis', type: 'loading' },
    { id: 'results', title: 'Results', type: 'results' }
  ];

  useEffect(() => {
    startPanelSession();
  }, []);

  useEffect(() => {
    if (currentSession) {
      updateCurrentStep();
    }
  }, [currentSession]);

  const startPanelSession = async () => {
    const session = await startPanel(panelId, patientId, {
      location: { county: 'nairobi' }
    });
    
    if (!session) {
      Alert.alert('Error', 'Failed to start child panel');
      onCancel();
    }
  };

  const updateCurrentStep = () => {
    if (!currentSession) return;

    const completedSteps = Array.from(currentSession.stepResults.keys());
    
    for (let i = 0; i < steps.length; i++) {
      if (!completedSteps.includes(steps[i].id)) {
        setCurrentStep(i);
        return;
      }
    }
    
    setCurrentStep(steps.length - 1);
  };

  const handleSymptomsSubmit = (symptomData: any) => {
    setSymptoms(symptomData);
  };

  const renderCurrentStep = () => {
    const step = steps[currentStep];

    switch (step.type) {
      case 'symptom_input':
        return (
          <SymptomInputStep
            stepId={step.id}
            title="Child Danger Signs Assessment"
            fields={childSymptomFields}
            initialData={symptoms}
            onSubmit={handleSymptomsSubmit}
            onBack={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : undefined}
            warningLevel="high"
          />
        );

      case 'sensor_capture':
        return (
          <SensorCaptureStep
            stepId={step.id}
            title={step.title}
            sensorType={step.id === 'child_breathing' ? 'audio' : 'camera'}
            instructions={getSensorInstructions(step.id)}
            onComplete={() => {}}
            onRetry={() => {}}
            onBack={() => setCurrentStep(currentStep - 1)}
            duration={step.id === 'child_breathing' ? 15 : 10}
          />
        );

      case 'loading':
        return (
          <LoadingStep
            title="Assessing Child Danger Signs"
            subtitle="Checking for pneumonia, malaria, dehydration, and malnutrition..."
            currentStep={currentSession?.currentStep || 0}
            totalSteps={currentSession?.config.steps.length || 0}
            estimatedTime={20}
          />
        );

      case 'results':
        return (
          <ResultsStep
            results={currentSession?.results}
            onComplete={onComplete}
            onBack={() => setCurrentStep(currentStep - 1)}
            panelType="child"
          />
        );

      default:
        return <Text>Unknown step type</Text>;
    }
  };

  const getSensorInstructions = (stepId: string): string => {
    switch (stepId) {
      case 'child_breathing':
        return 'Record the child breathing naturally. If possible, capture any cough sounds.';
      case 'child_facial':
        return 'Clear view of child face for hydration and pallor assessment. Ensure good lighting.';
      default:
        return 'Please follow the on-screen instructions.';
    }
  };

  const childSymptomFields = [
    {
      id: 'age_months',
      type: 'number' as const,
      label: 'Child Age (months)',
      required: true,
      placeholder: 'Age in months',
      validation: { min: 0, max: 60 }
    },
    {
      id: 'feeding_difficulty',
      type: 'select' as const,
      label: 'Feeding Difficulty',
      required: true,
      options: [
        { label: 'Feeding Normally', value: 'none' },
        { label: 'Some Difficulty', value: 'some' },
        { label: 'Not Feeding', value: 'severe' }
      ]
    },
    {
      id: 'lethargy',
      type: 'boolean' as const,
      label: 'Lethargy or Unconsciousness',
      required: false,
      warning: true
    },
    {
      id: 'fever_duration',
      type: 'number' as const,
      label: 'Fever Duration (days)',
      required: false,
      placeholder: 'Days with fever'
    },
    {
      id: 'vomiting',
      type: 'boolean' as const,
      label: 'Vomiting',
      required: false
    },
    {
      id: 'diarrhea',
      type: 'boolean' as const,
      label: 'Diarrhea',
      required: false
    }
  ];

  return (
    <View style={styles.container}>
      <PanelProgress
        steps={steps}
        currentStep={currentStep}
        currentSession={currentSession}
      />
      
      <ScrollView style={styles.content}>
        {renderCurrentStep()}
        
        {/* WHO IMCI Quick Reference */}
        <View style={styles.imciReference}>
          <Text style={styles.imciTitle}>WHO IMCI Danger Signs</Text>
          <Text style={styles.imciItem}>• Not able to drink or breastfeed</Text>
          <Text style={styles.imciItem}>• Vomits everything</Text>
          <Text style={styles.imciItem}>• Convulsions</Text>
          <Text style={styles.imciItem}>• Lethargic or unconscious</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    padding: 16
  },
  imciReference: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 20
  },
  imciTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 8
  },
  imciItem: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4
  }
});
