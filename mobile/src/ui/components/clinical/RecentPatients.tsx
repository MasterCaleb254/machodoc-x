import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useTranslation } from '../../i18n/TranslationProvider';

interface RecentPatientsProps {
  onPatientSelect: (patientId: string) => void;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: Date;
}

export const RecentPatients: React.FC<RecentPatientsProps> = ({ onPatientSelect }) => {
  const { t } = useTranslation();
  const database = useDatabase();
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);

  useEffect(() => {
    loadRecentPatients();
  }, []);

  const loadRecentPatients = async () => {
    try {
      // This would be replaced with actual database query
      // For now, we use mock data
      const mockPatients: Patient[] = [
        { id: '1', name: 'John Doe', age: 25, gender: 'male', lastVisit: new Date() },
        { id: '2', name: 'Jane Smith', age: 30, gender: 'female', lastVisit: new Date() },
        { id: '3', name: 'Alice Johnson', age: 28, gender: 'female', lastVisit: new Date() }
      ];
      setRecentPatients(mockPatients);
    } catch (error) {
      console.error('Failed to load recent patients:', error);
    }
  };

  if (recentPatients.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Patients</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recentPatients.map(patient => (
          <TouchableOpacity
            key={patient.id}
            style={styles.patientCard}
            onPress={() => onPatientSelect(patient.id)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {patient.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientDetails}>
              {patient.age}y • {patient.gender}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12
  },
  patientCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    minWidth: 80
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  patientName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center'
  },
  patientDetails: {
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center'
  }
});
