import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { usePanelOrchestrator } from '../hooks/usePanelOrchestrator';
import { SensorCaptureStep } from './SensorCaptureStep';
import { SymptomInputStep } from './SymptomInputStep';
import { LoadingStep } from './LoadingStep';
import { ResultsStep } from './ResultsStep';
import { PanelProgress } from './PanelProgress';

interface RespiratoryPanelProps {
  patientId: string;
  onComplete: (results: any) => void;
  onCancel: () => void;
}

export const RespiratoryPanel: React.FC<RespiratoryPanelProps> = ({
  patientId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [symptoms, setSymptoms] = useState({
    cough_duration: '',
    breathing_difficulty: 'none',
    fever: false,
    chest_pain: false,
    cough_type: 'dry'
  });

  const {
    startPanel,
    currentSession,
    activeSessions,
    error
  } = usePanelOrchestrator();

  const panelId = 'respiratory_rapid';
  const steps = [
    { id: 'symptom_intake', title: 'Symptom Assessment', type: 'symptom_input' },
    { id: 'cough_recording', title: 'Cough Recording', type: 'sensor_capture' },
    { id: 'facial_capture', title: 'Facial Analysis', type: 'sensor_capture' },
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

  useEffect(() => {
    if (error) {
      Alert.alert('Panel Error', error);
    }
  }, [error]);

  const startPanelSession = async () => {
    const session = await startPanel(panelId, patientId, {
      location: { county: 'nairobi' }
    });
    
    if (!session) {
      Alert.alert('Error', 'Failed to start respiratory panel');
      onCancel();
    }
  };

  const updateCurrentStep = () => {
    if (!currentSession) return;

    const completedSteps = Array.from(currentSession.stepResults.keys());
    
    // Find current step based on completed steps
    for (let i = 0; i < steps.length; i++) {
      if (!completedSteps.includes(steps[i].id)) {
        setCurrentStep(i);
        return;
      }
    }
    
    // All steps completed
    setCurrentStep(steps.length - 1);
  };

  const handleSymptomsSubmit = (symptomData: any) => {
    setSymptoms(symptomData);
    // In a real implementation, this would update the panel session
  };

  const handleSensorComplete = (sensorData: any) => {
    // Sensor data is automatically handled by the orchestrator
    console.log('Sensor capture completed:', sensorData);
  };

  const handleRetryStep = (stepId: string) => {
    // Implementation would retry the specific step
    console.log('Retrying step:', stepId);
  };

  const renderCurrentStep = () => {
    const step = steps[currentStep];

    switch (step.type) {
      case 'symptom_input':
        return (
          <SymptomInputStep
            stepId={step.id}
            title="Respiratory Symptoms"
            fields={respiratorySymptomFields}
            initialData={symptoms}
            onSubmit={handleSymptomsSubmit}
            onBack={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : undefined}
          />
        );

      case 'sensor_capture':
        return (
          <SensorCaptureStep
            stepId={step.id}
            title={step.title}
            sensorType={step.id === 'cough_recording' ? 'audio' : 'camera'}
            instructions={getSensorInstructions(step.id)}
            onComplete={handleSensorComplete}
            onRetry={() => handleRetryStep(step.id)}
            onBack={() => setCurrentStep(currentStep - 1)}
          />
        );

      case 'loading':
        return (
          <LoadingStep
            title="Analyzing Respiratory Data"
            subtitle="This may take a few moments..."
            currentStep={currentSession?.currentStep || 0}
            totalSteps={currentSession?.config.steps.length || 0}
            estimatedTime={30}
          />
        );

      case 'results':
        return (
          <ResultsStep
            results={currentSession?.results}
            onComplete={onComplete}
            onBack={() => setCurrentStep(currentStep - 1)}
          />
        );

      default:
        return <Text>Unknown step type</Text>;
    }
  };

  const getSensorInstructions = (stepId: string): string => {
    switch (stepId) {
      case 'cough_recording':
        return 'Please cough naturally 3-4 times into the microphone. Ensure you are in a quiet environment.';
      case 'facial_capture':
        return 'Please keep your face steady and visible in the frame. Good lighting will improve accuracy.';
      default:
        return 'Please follow the on-screen instructions.';
    }
  };

  const respiratorySymptomFields = [
    {
      id: 'cough_duration',
      type: 'number' as const,
      label: 'Cough Duration (days)',
      required: true,
      placeholder: 'How many days have you been coughing?',
      validation: { min: 0, max: 90 }
    },
    {
      id: 'cough_type',
      type: 'select' as const,
      label: 'Cough Type',
      required: true,
      options: [
        { label: 'Dry Cough', value: 'dry' },
        { label: 'Wet/Productive Cough', value: 'wet' },
        { label: 'Barking Cough', value: 'barking' },
        { label: 'Whooping Cough', value: 'whooping' }
      ]
    },
    {
      id: 'breathing_difficulty',
      type: 'select' as const,
      label: 'Breathing Difficulty',
      required: true,
      options: [
        { label: 'No Difficulty', value: 'none' },
        { label: 'Mild Difficulty', value: 'mild' },
        { label: 'Moderate Difficulty', value: 'moderate' },
        { label: 'Severe Difficulty', value: 'severe' }
      ]
    },
    {
      id: 'fever',
      type: 'boolean' as const,
      label: 'Fever Present',
      required: false
    },
    {
      id: 'chest_pain',
      type: 'boolean' as const,
      label: 'Chest Pain',
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
      </ScrollView>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336'
  },
  errorText: {
    color: '#c62828',
    fontSize: 14
  }
});
