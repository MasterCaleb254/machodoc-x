import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface EmergencyButtonProps {
  onPress: () => void;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({ onPress }) => {
  const { t } = useTranslation();

  const handlePress = () => {
    Alert.alert(
      t('emergency.alert_title'),
      t('emergency.alert_message'),
      [
        { text: t('button.cancel'), style: 'cancel' },
        { text: t('button.emergency'), onPress: onPress, style: 'destructive' }
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Text style={styles.text}>{t('button.emergency')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    margin: 16
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
