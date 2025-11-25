import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useTranslation } from '../i18n/TranslationProvider';

import { ClinicalHeader } from '../components/core/ClinicalHeader';
import { ClinicalForm } from '../components/forms/ClinicalForm';
import { VoiceGuidance } from '../components/accessibility/VoiceGuidance';

export const PatientRegistrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const database = useDatabase();
  
  const { panelType } = route.params as { panelType?: string };
  const [currentStep, setCurrentStep] = useState(0);

  const registrationSteps = [
    {
      title: 'Basic Information',
      component: BasicInfoStep,
      validation: (data: any) => data.age && data.gender
    },
    {
      title: 'Medical History',
      component: MedicalHistoryStep,
      validation: (data: any) => true // Optional step
    },
    {
      title: 'Risk Factors',
      component: RiskFactorsStep,
      validation: (data: any) => true // Optional step
    }
  ];

  const handleStepComplete = async (stepData: any) => {
    const updatedData = { ...stepData };

    if (currentStep === registrationSteps.length - 1) {
      // Final step - save patient and proceed
      const patientId = await savePatient(updatedData);
      
      if (panelType) {
        // Direct to specific panel if preselected
        navigation.navigate('PanelSelection', { patientId });
      } else {
        navigation.navigate('PanelSelection', { patientId });
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const savePatient = async (data: any): Promise<string> => {
    try {
      // Using your WatermelonDB setup from Epic 1
      return await database.write(async () => {
        const patientsCollection = database.collections.get('patients');
        const patient = await patientsCollection.create((patient: any) => {
          patient.anonymous_id = generateAnonymousId();
          patient.basic_info = {
            age: parseInt(data.age),
            gender: data.gender,
            location: data.location
          };
          patient.medical_history = data.medicalHistory || [];
          patient.risk_factors = data.riskFactors || [];
          patient.created_at = new Date();
          patient.updated_at = new Date();
        });
        return patient.id;
      });
    } catch (error) {
      console.error('Failed to save patient:', error);
      Alert.alert('Error', 'Failed to save patient data');
      throw error;
    }
  };

  const CurrentStepComponent = registrationSteps[currentStep].component;

  return (
    <View style={styles.container}>
      <ClinicalHeader
        title="Register Patient"
        subtitle={`Step ${currentStep + 1} of ${registrationSteps.length}`}
        showBack={currentStep > 0}
        onBack={() => setCurrentStep(currentStep - 1)}
      />

      <VoiceGuidance 
        text={`Patient registration step ${currentStep + 1}. Please provide the requested information.`}
        autoPlay={true}
      />
      
      <ScrollView style={styles.scrollView}>
        <CurrentStepComponent
          onComplete={handleStepComplete}
          panelType={panelType}
        />
      </ScrollView>
    </View>
  );
};

// Step Components
const BasicInfoStep: React.FC<{ onComplete: (data: any) => void; panelType?: string }> = ({ 
  onComplete, panelType 
}) => {
  const { t } = useTranslation();

  const fields = [
    {
      id: 'age',
      type: 'number' as const,
      label: 'Age',
      required: true,
      placeholder: 'Enter age in years',
      validation: { min: 0, max: 120 }
    },
    {
      id: 'gender',
      type: 'select' as const,
      label: 'Gender',
      required: true,
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'location',
      type: 'text' as const,
      label: 'Location (County)',
      required: false,
      placeholder: 'e.g., Nairobi, Kisumu'
    }
  ];

  return (
    <ClinicalForm
      title="Basic Information"
      subtitle={panelType ? `Starting ${panelType} assessment` : undefined}
      fields={fields}
      onSubmit={onComplete}
      submitText="Continue"
    />
  );
};

const MedicalHistoryStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  const fields = [
    {
      id: 'medicalHistory',
      type: 'multiselect' as const,
      label: 'Existing Conditions',
      required: false,
      options: [
        { label: 'Hypertension', value: 'hypertension' },
        { label: 'Diabetes', value: 'diabetes' },
        { label: 'Asthma', value: 'asthma' },
        { label: 'HIV', value: 'hiv' },
        { label: 'Tuberculosis', value: 'tuberculosis' },
        { label: 'None', value: 'none' }
      ]
    },
    {
      id: 'medications',
      type: 'text' as const,
      label: 'Current Medications',
      required: false,
      placeholder: 'List current medications'
    },
    {
      id: 'allergies',
      type: 'text' as const,
      label: 'Allergies',
      required: false,
      placeholder: 'List known allergies'
    }
  ];

  return (
    <ClinicalForm
      title="Medical History"
      subtitle="Optional - helps improve assessment accuracy"
      fields={fields}
      onSubmit={onComplete}
      submitText="Continue"
      showSkip={true}
      onSkip={() => onComplete({})}
    />
  );
};

const RiskFactorsStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  const fields = [
    {
      id: 'smoking',
      type: 'boolean' as const,
      label: 'Smoking',
      required: false
    },
    {
      id: 'alcohol',
      type: 'boolean' as const,
      label: 'Alcohol Use',
      required: false
    },
    {
      id: 'familyHistory',
      type: 'multiselect' as const,
      label: 'Family History',
      required: false,
      options: [
        { label: 'Heart Disease', value: 'heart_disease' },
        { label: 'Diabetes', value: 'diabetes' },
        { label: 'Cancer', value: 'cancer' },
        { label: 'Stroke', value: 'stroke' },
        { label: 'None', value: 'none' }
      ]
    }
  ];

  return (
    <ClinicalForm
      title="Risk Factors"
      subtitle="Optional lifestyle and family history"
      fields={fields}
      onSubmit={onComplete}
      submitText="Complete Registration"
      showSkip={true}
      onSkip={() => onComplete({})}
    />
  );
};

const generateAnonymousId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `pat_${timestamp}_${random}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollView: {
    flex: 1
  }
});
