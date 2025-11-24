import { useState, useCallback, useEffect } from 'react';
import { BayesianFusionEngine, FusionInput, FusionResult } from '../BayesianFusionEngine';

export const useFusionEngine = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<FusionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fusionEngine = BayesianFusionEngine.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        await fusionEngine.initialize();
        setIsInitialized(true);
      } catch (err) {
        setError(`Fusion engine initialization failed: ${err.message}`);
      }
    };

    initialize();
  }, []);

  const fuseData = useCallback(async (input: FusionInput): Promise<FusionResult | null> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await fusionEngine.fuseData(input);
      setLastResult(result);
      
      return result;
    } catch (err) {
      setError(`Data fusion failed: ${err.message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getNetworkStatus = useCallback(async (panelType: string) => {
    try {
      return await fusionEngine.getNetworkStatus(panelType);
    } catch (err) {
      setError(`Failed to get network status: ${err.message}`);
      return null;
    }
  }, []);

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await fusionEngine.clearCache();
      setLastResult(null);
      setError(null);
    } catch (err) {
      setError(`Failed to clear cache: ${err.message}`);
    }
  }, []);

  return {
    isInitialized,
    isProcessing,
    lastResult,
    error,
    fuseData,
    getNetworkStatus,
    clearCache
  };
};
