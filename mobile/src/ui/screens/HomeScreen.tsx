import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationProvider';

import { ClinicalCard } from '../components/core/ClinicalCard';
import { EmergencyButton } from '../components/clinical/EmergencyButton';
import { QuickActions } from '../components/clinical/QuickActions';
import { RecentPatients } from '../components/clinical/RecentPatients';
import { LanguageSelector } from '../components/i18n/LanguageSelector';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleQuickPanelStart = (panelType: string) => {
    navigation.navigate('PatientRegistration', { panelType });
  };

  const handleEmergency = () => {
    navigation.navigate('PatientRegistration', { panelType: 'respiratory' });
  };

  const handlePatientSelect = (patientId: string) => {
    navigation.navigate('PanelSelection', { patientId });
  };

  return (
    <View style={styles.container}>
      <EmergencyButton onPress={handleEmergency} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ClinicalCard 
          title={t('home.welcome')}
          subtitle={t('home.select_assessment')}
          variant="info"
        >
          <QuickActions onPanelSelect={handleQuickPanelStart} />
        </ClinicalCard>

        <RecentPatients onPatientSelect={handlePatientSelect} />

        {/* Clinical Statistics */}
        <ClinicalCard 
          title="Today's Activity"
          variant="neutral"
        >
          <View style={styles.statsContainer}>
            <StatItem 
              label="Patients Today"
              value="12"
              trend="+2"
            />
            <StatItem 
              label="Emergencies"
              value="1"
              trend="0"
            />
            <StatItem 
              label="Avg. Time"
              value="4.2m"
              trend="-0.3m"
            />
          </View>
        </ClinicalCard>
      </ScrollView>

      <LanguageSelector />
    </View>
  );
};

const StatItem: React.FC<{ label: string; value: string; trend: string }> = ({ 
  label, value, trend 
}) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[
      styles.statTrend, 
      trend.startsWith('+') ? styles.trendPositive : styles.trendNegative
    ]}>
      {trend}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50'
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4
  },
  statTrend: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600'
  },
  trendPositive: {
    color: '#27ae60'
  },
  trendNegative: {
    color: '#e74c3c'
  }
});
