import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface QuickActionsProps {
  onPanelSelect: (panelType: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onPanelSelect }) => {
  const { t } = useTranslation();

  const quickActions = [
    {
      id: 'respiratory',
      title: t('panels.respiratory.title'),
      icon: '🫁',
      color: '#3498db'
    },
    {
      id: 'maternal',
      title: t('panels.maternal.title'),
      icon: '👶',
      color: '#e84393'
    },
    {
      id: 'child',
      title: t('panels.child.title'),
      icon: '🧒',
      color: '#f39c12'
    },
    {
      id: 'infection',
      title: 'Infection',
      icon: '🦠',
      color: '#9b59b6'
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Assessments</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionButton, { backgroundColor: action.color }]}
            onPress={() => onPanelSelect(action.id)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  actionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  }
});
