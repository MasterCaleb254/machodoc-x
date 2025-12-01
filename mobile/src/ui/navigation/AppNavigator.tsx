import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDatabase } from '@nozbe/watermelondb/react';

// Import your existing panels from Epic 4
import { RespiratoryPanel } from '../../panels/components/RespiratoryPanel';
import { MaternalPanel } from '../../panels/components/MaternalPanel';
import { ChildDangerSignsPanel } from '../../panels/components/ChildDangerSignsPanel';

// New Epic 5 UI components we're building
import { HomeScreen } from '../screens/HomeScreen';
import { PatientRegistrationScreen } from '../screens/PatientRegistrationScreen';
import { PanelSelectionScreen } from '../screens/PanelSelectionScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { TranslationProvider } from '../i18n/TranslationProvider';

export type RootStackParamList = {
  Home: undefined;
  PatientRegistration: { panelType?: string };
  PanelSelection: { patientId: string };
  RespiratoryPanel: { patientId: string };
  MaternalPanel: { patientId: string };
  ChildDangerSignsPanel: { patientId: string };
  InfectionPanel: { patientId: string };
  ChronicPanel: { patientId: string };
  Results: { patientId: string; sessionId: string; panelType: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <TranslationProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#0066cc' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '600' }
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'MachoDoc X' }}
          />
          
          <Stack.Screen 
            name="PatientRegistration" 
            component={PatientRegistrationScreen}
            options={{ title: 'Register Patient' }}
          />
          
          <Stack.Screen 
            name="PanelSelection" 
            component={PanelSelectionScreen}
            options={{ title: 'Select Diagnostic Panel' }}
          />

          {/* Integrating your existing Epic 4 panels */}
          <Stack.Screen 
            name="RespiratoryPanel" 
            component={RespiratoryPanel}
            options={{ title: 'Respiratory Assessment' }}
          />
          
          <Stack.Screen 
            name="MaternalPanel" 
            component={MaternalPanel}
            options={{ title: 'Maternal Health Check' }}
          />
          
          <Stack.Screen 
            name="ChildDangerSignsPanel" 
            component={ChildDangerSignsPanel}
            options={{ title: 'Child Danger Signs' }}
          />

          <Stack.Screen 
            name="InfectionPanel" 
            component={ChildDangerSignsPanel} // Temporary - update when InfectionPanel exists
            options={{ title: 'Infection Screening' }}
          />

          <Stack.Screen 
            name="ChronicPanel" 
            component={ChildDangerSignsPanel} // Temporary - update when ChronicPanel exists
            options={{ title: 'Chronic Conditions' }}
          />

          <Stack.Screen 
            name="Results" 
            component={ResultsScreen}
            options={{ title: 'Assessment Results' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TranslationProvider>
  );
};
