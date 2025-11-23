import { useState, useCallback, useEffect } from 'react';
import { ModelManager, ModelMetadata, InferenceResult } from '../ModelManager';
import * as tf from '@tensorflow/tfjs';

export const useModelManager = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedModels, setLoadedModels] = useState<Map<string, ModelMetadata>>(new Map());
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modelManager = ModelManager.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await modelManager.initialize();
        setIsInitialized(true);
        
        // Get initial state
        setLoadedModels(modelManager.getAllModelStatus());
        setMemoryUsage(modelManager.getTotalMemoryUsage());
        
      } catch (err) {
        setError(`Model manager initialization failed: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Set up memory monitoring
    const memoryInterval = setInterval(() => {
      setMemoryUsage(modelManager.getTotalMemoryUsage());
    }, 5000);

    return () => {
      clearInterval(memoryInterval);
    };
  }, []);

  const loadModel = useCallback(async (modelId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await modelManager.loadModel(modelId);
      setLoadedModels(modelManager.getAllModelStatus());
      
      return true;
    } catch (err) {
      setError(`Failed to load model ${modelId}: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runInference = useCallback(async (
    modelId: string,
    input: tf.Tensor | tf.Tensor[],
    options?: { warmup?: boolean }
  ): Promise<InferenceResult> => {
    try {
      setError(null);
      return await modelManager.runInference(modelId, input, options);
    } catch (err) {
      setError(`Inference failed for model ${modelId}: ${err.message}`);
      throw err;
    }
  }, []);

  const unloadModel = useCallback(async (modelId: string): Promise<void> => {
    try {
      await modelManager.unloadModel(modelId);
      setLoadedModels(modelManager.getAllModelStatus());
      setMemoryUsage(modelManager.getTotalMemoryUsage());
    } catch (err) {
      setError(`Failed to unload model ${modelId}: ${err.message}`);
    }
  }, []);

  const checkForUpdates = useCallback(async (): Promise<Map<string, boolean>> => {
    try {
      return await modelManager.checkForUpdates();
    } catch (err) {
      setError(`Failed to check for updates: ${err.message}`);
      return new Map();
    }
  }, []);

  const updateModel = useCallback(async (modelId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await modelManager.updateModel(modelId);
      setLoadedModels(modelManager.getAllModelStatus());
      return success;
    } catch (err) {
      setError(`Failed to update model ${modelId}: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cleanupMemory = useCallback(async (): Promise<void> => {
    try {
      await modelManager.cleanupMemory();
      setMemoryUsage(modelManager.getTotalMemoryUsage());
    } catch (err) {
      setError(`Memory cleanup failed: ${err.message}`);
    }
  }, []);

  const getPerformanceReport = useCallback((): any => {
    return modelManager.getPerformanceReport();
  }, []);

  return {
    isInitialized,
    isLoading,
    loadedModels,
    memoryUsage,
    error,
    loadModel,
    runInference,
    unloadModel,
    checkForUpdates,
    updateModel,
    cleanupMemory,
    getPerformanceReport
  };
};
