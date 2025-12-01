import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface Condition {
  condition: string;
  probability: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ConditionListProps {
  conditions: Condition[];
  panelType: string;
}

export const ConditionList: React.FC<ConditionListProps> = ({ conditions, panelType }) => {
  const { t } = useTranslation();

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Identified Conditions</Text>
      
      {conditions.map((condition, index) => (
        <View key={index} style={styles.conditionItem}>
          <View style={styles.conditionHeader}>
            <Text style={styles.conditionName}>{condition.condition}</Text>
            <View style={styles.riskBadge}>
              <Text style={styles.riskIcon}>{getRiskIcon(condition.riskLevel)}</Text>
              <Text style={[styles.riskLevel, { color: getRiskColor(condition.riskLevel) }]}>
                {condition.riskLevel.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.probabilityContainer}>
            <Text style={styles.probabilityLabel}>Probability:</Text>
            <Text style={styles.probabilityValue}>
              {Math.round(condition.probability * 100)}%
            </Text>
            <Text style={styles.confidenceValue}>
              (Confidence: {Math.round(condition.confidence * 100)}%)
            </Text>
          </View>
        </View>
      ))}
      
      {conditions.length === 0 && (
        <Text style={styles.noConditions}>No conditions identified with sufficient confidence.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16
  },
  conditionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  riskIcon: {
    marginRight: 4
  },
  riskLevel: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  probabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  probabilityLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8
  },
  probabilityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8
  },
  confidenceValue: {
    fontSize: 12,
    color: '#7f8c8d'
  },
  noConditions: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});
