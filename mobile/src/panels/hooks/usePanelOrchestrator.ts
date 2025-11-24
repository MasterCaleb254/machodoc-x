import { useState, useCallback, useEffect } from 'react';
import { PanelOrchestrator, PanelSession, PanelConfig } from '../PanelOrchestrator';
import { PANEL_CONFIGS } from '../PanelConfig';

export const usePanelOrchestrator = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSessions, setActiveSessions] = useState<PanelSession[]>([]);
  const [currentSession, setCurrentSession] = useState<PanelSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orchestrator = PanelOrchestrator.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        await orchestrator.initialize();
        setIsInitialized(true);
        
        // Set up event listeners
        orchestrator.on('sessionStarted', (session) => {
          setCurrentSession(session);
          setActiveSessions(orchestrator.getActiveSessions());
        });
        
        orchestrator.on('sessionCompleted', (session) => {
          setCurrentSession(null);
          setActiveSessions(orchestrator.getActiveSessions());
        });
        
        orchestrator.on('sessionFailed', (session, error) => {
          setCurrentSession(null);
          setActiveSessions(orchestrator.getActiveSessions());
          setError(`Session failed: ${error}`);
        });
        
        orchestrator.on('stepStarted', (session, step) => {
          setCurrentSession(session);
          console.log(`Step started: ${step.id}`);
        });
        
        orchestrator.on('stepCompleted', (session, step) => {
          setCurrentSession(session);
          console.log(`Step completed: ${step.id}`);
        });
        
        orchestrator.on('stepProgress', (session, step, output) => {
          setCurrentSession(session);
          // Update UI with step progress
        });

      } catch (err) {
        setError(`Orchestrator initialization failed: ${err.message}`);
      }
    };

    initialize();

    return () => {
      // Clean up event listeners
      orchestrator.removeAllListeners();
    };
  }, []);

  const startPanel = useCallback(async (
    panelId: string,
    patientId: string,
    context: any = {}
  ): Promise<PanelSession | null> => {
    try {
      setError(null);
      const session = await orchestrator.startPanel(panelId, patientId, context);
      return session;
    } catch (err) {
      setError(`Failed to start panel: ${err.message}`);
      return null;
    }
  }, []);

  const stopSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await orchestrator.stopSession(sessionId);
      setActiveSessions(orchestrator.getActiveSessions());
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      setError(`Failed to stop session: ${err.message}`);
    }
  }, [currentSession]);

  const pauseSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await orchestrator.pauseSession(sessionId);
      setActiveSessions(orchestrator.getActiveSessions());
    } catch (err) {
      setError(`Failed to pause session: ${err.message}`);
    }
  }, []);

  const resumeSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await orchestrator.resumeSession(sessionId);
      setActiveSessions(orchestrator.getActiveSessions());
    } catch (err) {
      setError(`Failed to resume session: ${err.message}`);
    }
  }, []);

  const getSessionStatus = useCallback(async (sessionId: string): Promise<PanelSession | null> => {
    return await orchestrator.getSessionStatus(sessionId);
  }, []);

  const getAvailablePanels = useCallback((): string[] => {
    return orchestrator.getAvailablePanels();
  }, []);

  const getPanelConfig = useCallback((panelId: string): PanelConfig | null => {
    return orchestrator.getPanelConfig(panelId);
  }, []);

  const getPanelConfigs = useCallback((): Map<string, PanelConfig> => {
    return PANEL_CONFIGS;
  }, []);

  return {
    isInitialized,
    activeSessions,
    currentSession,
    error,
    startPanel,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionStatus,
    getAvailablePanels,
    getPanelConfig,
    getPanelConfigs
  };
};
