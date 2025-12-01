import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationProvider';

import { PanelCard } from '../components/clinical/PanelCard';
import { ClinicalHeader } from '../components/core/ClinicalHeader';
import { VoiceGuidance } from '../components/accessibility/VoiceGuidance';

export const PanelSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { patientId } = route.params as { patientId: string };

  // Panel configurations matching your Epic 4 panels
  const availablePanels = [
    {
      id: 'respiratory',
      title: t('panels.respiratory.title'),
      description: t('panels.respiratory.description'),
      icon: 'lungs',
      color: '#3498db',
      estimatedTime: '3-5 minutes',
      conditions: ['Pneumonia', 'TB', 'COVID-19', 'Asthma'],
      requiredSensors: ['audio', 'camera'],
      urgencyLevels: ['high', 'critical']
    },
    {
      id: 'maternal',
      title: t('panels.maternal.title'),
      description: t('panels.maternal.description'),
      icon: 'baby',
      color: '#e84393',
      estimatedTime: '4-6 minutes',
      conditions: ['Anemia', 'Preeclampsia', 'UTI'],
      requiredSensors: ['camera', 'symptoms'],
      urgencyLevels: ['medium', 'high']
    },
    {
      id: 'child',
      title: t('panels.child.title'),
      description: 'WHO IMCI danger signs assessment',
      icon: 'child',
      color: '#f39c12',
      estimatedTime: '2-4 minutes',
      conditions: ['Danger Signs', 'Dehydration', 'Malnutrition'],
      requiredSensors: ['camera', 'audio', 'symptoms'],
      urgencyLevels: ['medium', 'high', 'critical']
    },
    {
      id: 'infection',
      title: 'Infection Screening',
      description: 'Malaria, typhoid, UTI screening',
      icon: 'virus',
      color: '#9b59b6',
      estimatedTime: '3-5 minutes',
      conditions: ['Malaria', 'Typhoid', 'UTI', 'Skin Infection'],
      requiredSensors: ['camera', 'symptoms'],
      urgencyLevels: ['medium', 'high']
    },
    {
      id: 'chronic',
      title: 'Chronic Conditions',
      description: 'Hypertension, diabetes, anemia monitoring',
      icon: 'heartbeat',
      color: '#e74c3c',
      estimatedTime: '5-7 minutes',
      conditions: ['Diabetes', 'Hypertension', 'Asthma'],
      requiredSensors: ['camera', 'symptoms'],
      urgencyLevels: ['low', 'medium']
    }
  ];

  const handlePanelSelect = (panelId: string) => {
    // Navigate to your existing panel components from Epic 4
    switch (panelId) {
      case 'respiratory':
        navigation.navigate('RespiratoryPanel', { patientId });
        break;
      case 'maternal':
        navigation.navigate('MaternalPanel', { patientId });
        break;
      case 'child':
        navigation.navigate('ChildDangerSignsPanel', { patientId });
        break;
      case 'infection':
        navigation.navigate('InfectionPanel', { patientId });
        break;
      case 'chronic':
        navigation.navigate('ChronicPanel', { patientId });
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ClinicalHeader
        title="Select Diagnostic Panel"
        subtitle="Choose the appropriate health assessment"
      />

      <VoiceGuidance 
        text="Please select a diagnostic panel. Available panels include respiratory, maternal health, child danger signs, infection screening, and chronic conditions monitoring."
        urgency="important"
        autoPlay={true}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.panelsGrid}>
          {availablePanels.map(panel => (
            <PanelCard
              key={panel.id}
              panel={panel}
              onPress={() => handlePanelSelect(panel.id)}
              style={styles.panelCard}
            />
          ))}
        </View>

        {/* Clinical Safety Notice */}
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyTitle}>Clinical Safety</Text>
          <Text style={styles.safetyText}>
            • This tool assists but does not replace clinical judgment{'\n'}
            • Critical conditions always require immediate care{'\n'}
            • Verify results with laboratory tests when needed
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  panelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  panelCard: {
    width: '48%',
    marginBottom: 16
  },
  safetyNotice: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800'
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8
  },
  safetyText: {
    fontSize: 14,
    color: '#bf360c',
    lineHeight: 20
  }
});
