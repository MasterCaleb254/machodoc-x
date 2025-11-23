import { useState, useCallback, useEffect } from 'react';
import { SensorManager, SensorSession, SensorConfig } from '../SensorManager';

export const useSensorManager = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSession, setCurrentSession] = useState<SensorSession | null>(null);
  const [sensorStatus, setSensorStatus] = useState({ camera: false, audio: false });
  const [batteryStatus, setBatteryStatus] = useState({ level: 100, isCharging: false, thermal: 'normal' });
  const [error, setError] = useState<string | null>(null);

  const sensorManager = SensorManager.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        await sensorManager.initialize();
        setIsInitialized(true);
        setSensorStatus(sensorManager.getSensorStatus());
        
        // Get initial battery status
        const battery = await sensorManager.getBatteryStatus();
        setBatteryStatus(battery);

        // Set up event listeners
        sensorManager.on('sessionStarted', setCurrentSession);
        sensorManager.on('sessionCompleted', setCurrentSession);
        sensorManager.on('sessionError', (session, error) => {
          setCurrentSession(session);
          setError(error);
        });
        sensorManager.on('sensorCaptureStarted', (sensor) => {
          console.log(`Sensor capture started: ${sensor}`);
        });
        sensorManager.on('sensorCaptureCompleted', (sensor, data) => {
          console.log(`Sensor capture completed: ${sensor}`, data);
        });

      } catch (err) {
        setError(`Sensor manager initialization failed: ${err.message}`);
      }
    };

    initialize();

    return () => {
      // Cleanup event listeners
      sensorManager.removeAllListeners();
    };
  }, []);

  const startSession = useCallback(async (
    patientId: string,
    panelType: string,
    config?: Partial<SensorConfig>
  ): Promise<SensorSession> => {
    try {
      setError(null);
      const session = await sensorManager.startSensorSession(patientId, panelType, config);
      return session;
    } catch (err) {
      setError(`Failed to start sensor session: ${err.message}`);
      throw err;
    }
  }, []);

  const stopSession = useCallback(async (): Promise<void> => {
    try {
      await sensorManager.stopSensorSession();
      setCurrentSession(null);
    } catch (err) {
      setError(`Failed to stop sensor session: ${err.message}`);
    }
  }, []);

  const getSessionStatus = useCallback(async (): Promise<SensorSession | null> => {
    return await sensorManager.getSessionStatus();
  }, []);

  const refreshBatteryStatus = useCallback(async (): Promise<void> => {
    const battery = await sensorManager.getBatteryStatus();
    setBatteryStatus(battery);
  }, []);

  const isReady = useCallback(async (): Promise<boolean> => {
    return await sensorManager.isReady();
  }, []);

  return {
    isInitialized,
    currentSession,
    sensorStatus,
    batteryStatus,
    error,
    startSession,
    stopSession,
    getSessionStatus,
    refreshBatteryStatus,
    isReady
  };
};
