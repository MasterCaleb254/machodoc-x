import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RecommendationsListProps {
  recommendations: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({ recommendations, urgency }) => {
  const getUrgencyColor = () => {
    switch (urgency) {
      case 'critical':
        return '#f44336';
      case 'high':
        return '#ff9800';
      case 'medium':
        return '#ffeb3b';
      case 'low':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommended Actions</Text>
      {recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <View style={[styles.bullet, { backgroundColor: getUrgencyColor() }]} />
          <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      ))}
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
    marginBottom: 12
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20
  }
});
