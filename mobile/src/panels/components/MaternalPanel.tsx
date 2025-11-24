import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { usePanelOrchestrator } from '../hooks/usePanelOrchestrator';
import { SensorCaptureStep } from './SensorCaptureStep';
import { SymptomInputStep } from './SymptomInputStep';
import { LoadingStep } from './LoadingStep';
import { ResultsStep } from './ResultsStep';
import { PanelProgress } from './PanelProgress';

interface MaternalPanelProps {
  patientId: string;
  onComplete: (results: any) => void;
  onCancel: () => void;
}

export const MaternalPanel: React.FC<MaternalPanelProps> = ({
  patientId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [symptoms, setSymptoms] = useState({
    gestational_age: '',
    swelling: 'none',
    headaches: false,
    vision_changes: false,
    abdominal_pain: false,
    bleeding: false
  });

  const {
    startPanel,
    currentSession,
    error
  } = usePanelOrchestrator();

  const panelId = 'maternal_rapid';
  const steps = [
    { id: 'maternal_symptoms', title: 'Maternal Symptoms', type: 'symptom_input' },
    { id: 'facial_pallor', title: 'Facial Pallor Check', type: 'sensor_capture' },
    { id: 'vitals_monitoring', title: 'Vitals Monitoring', type: 'sensor_capture' },
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
      Alert.alert('Error', 'Failed to start maternal panel');
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
            title="Maternal Health Assessment"
            fields={maternalSymptomFields}
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
            sensorType="camera"
            instructions={getSensorInstructions(step.id)}
            onComplete={() => {}}
            onRetry={() => {}}
            onBack={() => setCurrentStep(currentStep - 1)}
            duration={step.id === 'vitals_monitoring' ? 30 : 8}
          />
        );

      case 'loading':
        return (
          <LoadingStep
            title="Analyzing Maternal Health Data"
            subtitle="Checking for anemia, preeclampsia, and other conditions..."
            currentStep={currentSession?.currentStep || 0}
            totalSteps={currentSession?.config.steps.length || 0}
            estimatedTime={25}
          />
        );

      case 'results':
        return (
          <ResultsStep
            results={currentSession?.results}
            onComplete={onComplete}
            onBack={() => setCurrentStep(currentStep - 1)}
            panelType="maternal"
          />
        );

      default:
        return <Text>Unknown step type</Text>;
    }
  };

  const getSensorInstructions = (stepId: string): string => {
    switch (stepId) {
      case 'facial_pallor':
        return 'Please ensure good lighting on your face for pallor assessment. Remove any makeup if possible.';
      case 'vitals_monitoring':
        return 'Please remain still for 30 seconds while we monitor your heart rate and blood pressure.';
      default:
        return 'Please follow the on-screen instructions.';
    }
  };

  const maternalSymptomFields = [
    {
      id: 'gestational_age',
      type: 'number' as const,
      label: 'Gestational Age (weeks)',
      required: true,
      placeholder: 'Current pregnancy week',
      validation: { min: 4, max: 42 }
    },
    {
      id: 'swelling',
      type: 'select' as const,
      label: 'Swelling (Edema)',
      required: true,
      options: [
        { label: 'No Swelling', value: 'none' },
        { label: 'Mild Swelling', value: 'mild' },
        { label: 'Moderate Swelling', value: 'moderate' },
        { label: 'Severe Swelling', value: 'severe' }
      ]
    },
    {
      id: 'headaches',
      type: 'boolean' as const,
      label: 'Persistent Headaches',
      required: false
    },
    {
      id: 'vision_changes',
      type: 'boolean' as const,
      label: 'Vision Changes',
      required: false,
      description: 'Blurred vision, seeing spots'
    },
    {
      id: 'abdominal_pain',
      type: 'boolean' as const,
      label: 'Abdominal Pain',
      required: false
    },
    {
      id: 'bleeding',
      type: 'boolean' as const,
      label: 'Vaginal Bleeding',
      required: false,
      warning: true
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
  }
});
