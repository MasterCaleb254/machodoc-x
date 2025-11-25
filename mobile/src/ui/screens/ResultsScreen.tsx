import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationProvider';

import { ClinicalHeader } from '../components/core/ClinicalHeader';
import { UrgencyIndicator } from '../components/clinical/UrgencyIndicator';
import { RiskScoreVisualization } from '../components/clinical/RiskScoreVisualization';
import { ConditionList } from '../components/clinical/ConditionList';
import { RecommendationsList } from '../components/clinical/RecommendationsList';
import { VoiceGuidance } from '../components/accessibility/VoiceGuidance';

// Types matching your Bayesian Fusion Engine output
interface ConditionProbability {
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

interface FusionResult {
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
  warnings: string[];
}

export const ResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  
  const { patientId, sessionId, panelType } = route.params as { 
    patientId: string; 
    sessionId: string; 
    panelType: string 
  };

  // In real app, this would come from your Epic 3 fusion engine
  const mockResults: FusionResult = {
    conditions: [
      {
        condition: 'pneumonia',
        probability: 0.76,
        confidence: 0.82,
        contributingFactors: ['cough_analysis', 'fever', 'breathing_difficulty'],
        riskLevel: 'high',
        evidence: [
          { source: 'cough_analysis', strength: 0.8, confidence: 0.9 },
          { source: 'respiratory_rate', strength: 0.7, confidence: 0.8 }
        ]
      },
      {
        condition: 'bronchitis',
        probability: 0.45,
        confidence: 0.65,
        contributingFactors: ['cough_duration'],
        riskLevel: 'medium',
        evidence: [
          { source: 'cough_duration', strength: 0.6, confidence: 0.7 }
        ]
      }
    ],
    riskScores: {
      overall: 0.76,
      respiratory: 0.82,
      infection: 0.45,
      hydration: 0.23,
      cardiovascular: 0.15
    },
    recommendations: [
      'Seek medical consultation within 24 hours',
      'Monitor breathing and temperature regularly',
      'Increase fluid intake',
      'Consider chest X-ray for confirmation'
    ],
    urgency: 'high',
    confidence: 0.78,
    warnings: [
      'High respiratory risk detected',
      'Monitor for worsening symptoms'
    ]
  };

  const handleNewAssessment = () => {
    navigation.navigate('PanelSelection', { patientId });
  };

  const handleHome = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <ClinicalHeader
        title="Assessment Results"
        subtitle={`${panelType} Panel • Confidence: ${Math.round(mockResults.confidence * 100)}%`}
        showBack={false}
      />

      <UrgencyIndicator 
        level={mockResults.urgency}
        onEmergency={() => {
          // Handle emergency protocol
          Alert.alert('Emergency', 'Directing to emergency protocols...');
        }}
      />

      <VoiceGuidance 
        text={`Assessment complete. ${mockResults.urgency} urgency. ${mockResults.conditions.length} conditions identified.`}
        urgency={mockResults.urgency}
        autoPlay={true}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Risk Scores Visualization */}
        <RiskScoreVisualization riskScores={mockResults.riskScores} />

        {/* Conditions List */}
        <ConditionList 
          conditions={mockResults.conditions}
          panelType={panelType}
        />

        {/* Recommendations */}
        <RecommendationsList 
          recommendations={mockResults.recommendations}
          urgency={mockResults.urgency}
        />

        {/* Warnings */}
        {mockResults.warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <Text style={styles.warningsTitle}>Important Notices</Text>
            {mockResults.warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>• {warning}</Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleNewAssessment}>
            <Text style={styles.secondaryButtonText}>New Assessment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={handleHome}>
            <Text style={styles.primaryButtonText}>Return Home</Text>
          </TouchableOpacity>
        </View>

        {/* Clinical Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This assessment is for decision support only. Always verify with clinical evaluation and laboratory tests when available.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  warningsContainer: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800'
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8
  },
  warningText: {
    fontSize: 14,
    color: '#bf360c',
    marginBottom: 4,
    lineHeight: 20
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  secondaryButtonText: {
    color: '#666',
  disclaimerText: {
    fontSize: 12,
    color: '#1565c0',
    lineHeight: 16
  }
});    textAlign: 'center',
  },
    fontSize: 16,
    fontWeight: '600'
  },
  disclaimer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
    marginTop: 8
    fontSize: 16,
    borderRadius: 8,
    color: '#ffffff',
  },
  primaryButtonText: {
    alignItems: 'center'
