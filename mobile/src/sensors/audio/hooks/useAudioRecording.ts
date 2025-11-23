import { useState, useCallback, useEffect } from 'react';
import { AudioProcessingManager, AudioAnalysisResult } from '../AudioProcessingManager';

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastResult, setLastResult] = useState<AudioAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioManager = AudioProcessingManager.getInstance();

  useEffect(() => {
    // Initialize audio manager
    audioManager.initialize().catch(err => {
      setError(`Audio initialization failed: ${err.message}`);
    });

    // Cleanup on unmount
    return () => {
      if (audioManager.isRecording()) {
        audioManager.cancelCurrentRecording();
      }
    };
  }, []);

  // Update recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(audioManager.getRecordingDuration());
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = useCallback(async (type: 'cough' | 'breathing' | 'speech' = 'cough') => {
    try {
      setError(null);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Recording is started within recordAndAnalyze
      console.log(`Starting ${type} recording...`);
      
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioAnalysisResult | null> => {
    try {
      setIsProcessing(true);
      const result = await audioManager.recordAndAnalyze('cough'); // Type would be passed properly
      setLastResult(result);
      return result;
    } catch (err) {
      setError(`Recording/analysis failed: ${err.message}`);
      return null;
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      setRecordingDuration(0);
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    await audioManager.cancelCurrentRecording();
    setIsRecording(false);
    setIsProcessing(false);
    setRecordingDuration(0);
    setError(null);
  }, []);

  const cleanupFiles = useCallback(async (filePaths: string[]) => {
    await audioManager.cleanupAudioFiles(filePaths);
  }, []);

  return {
    isRecording,
    isProcessing,
    recordingDuration,
    lastResult,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    cleanupFiles
  };
};
