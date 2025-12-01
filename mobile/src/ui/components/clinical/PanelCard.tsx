import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface Panel {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  estimatedTime: string;
  conditions: string[];
  requiredSensors: string[];
  urgencyLevels: string[];
}

interface PanelCardProps {
  panel: Panel;
  onPress: () => void;
  style?: any;
}

export const PanelCard: React.FC<PanelCardProps> = ({ panel, onPress, style }) => {
  const { t } = useTranslation();

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: string } = {
      lungs: '🫁',
      baby: '👶',
      child: '🧒',
      virus: '🦠',
      heartbeat: '💓'
    };
    return icons[iconName] || '🏥';
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderLeftColor: panel.color }, style]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{getIcon(panel.icon)}</Text>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{panel.title}</Text>
          <Text style={styles.time}>{panel.estimatedTime}</Text>
        </View>
      </View>

      <Text style={styles.description}>{panel.description}</Text>

      <View style={styles.conditions}>
        {panel.conditions.slice(0, 3).map((condition, index) => (
          <View key={index} style={styles.conditionTag}>
            <Text style={styles.conditionText}>{condition}</Text>
          </View>
        ))}
        {panel.conditions.length > 3 && (
          <View style={styles.conditionTag}>
            <Text style={styles.conditionText}>+{panel.conditions.length - 3}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.sensors}>
          {panel.requiredSensors.map((sensor, index) => (
            <View key={index} style={styles.sensorTag}>
              <Text style={styles.sensorText}>
                {sensor === 'camera' ? '📷' : sensor === 'audio' ? '🎤' : '📝'}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={[styles.urgency, { backgroundColor: panel.color }]}>
          <Text style={styles.urgencyText}>
            {panel.urgencyLevels.includes('critical') ? '🚨' : '⚠️'}
          </Text>
        </View>
      </View>
const styles = StyleSheet.create({
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 8
  },
  icon: {
    fontSize: 24,
    marginRight: 12
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50'
  },
  time: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12
  },
  conditions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 4
  },
  conditionTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  conditionText: {
    fontSize: 10,
    color: '#495057',
    fontWeight: '500'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sensors: {
    flexDirection: 'row',
    gap: 4
  },
  sensorTag: {
    backgroundColor: '#e9ecef',
    padding: 4,
    borderRadius: 4
  },
  sensorText: {
    fontSize: 10
  },
  urgency: {
    padding: 6,
    borderRadius: 6
  },
  urgencyText: {
    fontSize: 12
  }
});    shadowOpacity: 0.1,
    alignItems: 'center',
    flexDirection: 'row',
    shadowRadius: 4,
  header: {
    elevation: 2
  },
  container: {
    borderRadius: 12,
    backgroundColor: '#ffffff',

    </TouchableOpacity>
