import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface UrgencyIndicatorProps {
  level: 'critical' | 'high' | 'medium' | 'low';
  onEmergency?: () => void;
}

export const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({ level, onEmergency }) => {
  const { t } = useTranslation();

  const getUrgencyStyles = () => {
    switch (level) {
      case 'critical':
        return { backgroundColor: '#ffebee', borderColor: '#f44336', color: '#c62828' };
      case 'high':
        return { backgroundColor: '#fff3e0', borderColor: '#ff9800', color: '#e65100' };
      case 'medium':
        return { backgroundColor: '#fff9c4', borderColor: '#ffeb3b', color: '#f57f17' };
      case 'low':
        return { backgroundColor: '#e8f5e8', borderColor: '#4caf50', color: '#2e7d32' };
      default:
        return { backgroundColor: '#f5f5f5', borderColor: '#9e9e9e', color: '#424242' };
    }
  };

  const getUrgencyLabel = () => {
    switch (level) {
      case 'critical':
        return t('urgency.critical');
      case 'high':
        return t('urgency.high');
      case 'medium':
        return t('urgency.medium');
      case 'low':
        return t('urgency.low');
      default:
        return 'Unknown';
    }
  };

  const stylesheet = getUrgencyStyles();

  return (
    <View style={[styles.container, { backgroundColor: stylesheet.backgroundColor, borderColor: stylesheet.borderColor }]}>
      <Text style={[styles.text, { color: stylesheet.color }]}>{getUrgencyLabel()}</Text>
      {level === 'critical' && onEmergency && (
        <TouchableOpacity style={styles.emergencyButton} onPress={onEmergency}>
          <Text style={styles.emergencyButtonText}>🚨 Emergency Protocol</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderLeftWidth: 4,
    margin: 16,
    borderRadius: 4
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  emergencyButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#d32f2f',
    borderRadius: 4,
    alignItems: 'center'
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontWeight: 'bold'
  }
});
