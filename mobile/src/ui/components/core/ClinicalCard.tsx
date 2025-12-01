import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ClinicalCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'critical' | 'success' | 'neutral';
  onPress?: () => void;
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  title,
  subtitle,
  children,
  variant = 'neutral',
  onPress
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return { backgroundColor: '#ffebee', borderColor: '#f44336' };
      case 'warning':
        return { backgroundColor: '#fff3e0', borderColor: '#ff9800' };
      case 'success':
        return { backgroundColor: '#e8f5e8', borderColor: '#4caf50' };
      case 'info':
        return { backgroundColor: '#e3f2fd', borderColor: '#2196f3' };
      default:
        return { backgroundColor: '#ffffff', borderColor: '#e0e0e0' };
    }
  };

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent 
      style={[styles.container, getVariantStyles()]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      <View style={styles.content}>
        {children}
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50'
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4
  },
  content: {
    padding: 16
  }
});
