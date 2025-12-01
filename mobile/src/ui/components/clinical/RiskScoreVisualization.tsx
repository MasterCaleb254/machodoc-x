import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RiskScores {
  overall: number;
  respiratory: number;
  infection: number;
  hydration: number;
  cardiovascular: number;
}

interface RiskScoreVisualizationProps {
  riskScores: RiskScores;
}

export const RiskScoreVisualization: React.FC<RiskScoreVisualizationProps> = ({ riskScores }) => {
  const renderRiskBar = (label: string, score: number, color: string) => (
    <View style={styles.riskBarContainer} key={label}>
      <Text style={styles.riskLabel}>{label}</Text>
      <View style={styles.riskBarBackground}>
        <View 
          style={[
            styles.riskBarFill, 
            { width: `${score * 100}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.riskScore}>{Math.round(score * 100)}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Risk Assessment</Text>
      
      {renderRiskBar('Overall', riskScores.overall, '#e74c3c')}
      {renderRiskBar('Respiratory', riskScores.respiratory, '#3498db')}
      {renderRiskBar('Infection', riskScores.infection, '#9b59b6')}
      {renderRiskBar('Hydration', riskScores.hydration, '#f39c12')}
      {renderRiskBar('Cardiovascular', riskScores.cardiovascular, '#e84393')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16
  },
  riskBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  riskLabel: {
    width: 100,
    fontSize: 14,
    color: '#2c3e50'
  },
  riskBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 4
  },
  riskScore: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'right'
  }
});
