import React from 'react';
import { StatusBar } from 'react-native';
import { AppNavigator } from './ui/navigation/AppNavigator';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './storage/DatabaseManager';

const App: React.FC = () => {
  return (
    <DatabaseProvider database={database}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />
    </DatabaseProvider>
  );
};

export default App;
import { SyncModule } from './sync';
import { database } from './storage/DatabaseManager';

// ... inside your App component
useEffect(() => {
  const initializeApp = async () => {
    try {
      // ... other initializations

      // Initialize Sync Module (Epic 6)
      await SyncModule.initialize(database).initialize();

      // ... rest of app initialization
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  };

  initializeApp();
}, []);
