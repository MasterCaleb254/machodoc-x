import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraModule } from '../../sensors/camera/CameraModule';
import { AudioProcessingManager } from '../../sensors/audio/AudioProcessingManager';

interface SensorCaptureStepProps {
  stepId: string;
  title: string;
  sensorType: 'camera' | 'audio';
  instructions: string;
  onComplete: (data: any) => void;
  onRetry: () => void;
  onBack?: () => void;
  duration?: number;
}

export const SensorCaptureStep: React.FC<SensorCaptureStepProps> = ({
  stepId,
  title,
  sensorType,
  instructions,
  onComplete,
  onRetry,
  onBack,
  duration = 10
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureData, setCaptureData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSensor();
  }, []);

  const initializeSensor = async () => {
    try {
      if (sensorType === 'audio') {
        const audioManager = AudioProcessingManager.getInstance();
        await audioManager.initialize();
      }
      // Camera initialization happens in the CameraModule component
    } catch (err) {
      setError(`Failed to initialize ${sensorType} sensor: ${err.message}`);
    }
  };

  const startCapture = async () => {
    setIsCapturing(true);
    setError(null);
    setCaptureProgress(0);

    try {
      if (sensorType === 'audio') {
        await captureAudio();
      } else {
        // Camera capture is handled by the CameraModule component
        // We'll simulate progress for camera
        simulateCaptureProgress();
      }
    } catch (err) {
      setError(`Capture failed: ${err.message}`);
      setIsCapturing(false);
    }
  };

  const captureAudio = async () => {
    const audioManager = AudioProcessingManager.getInstance();
    
    // Simulate progress for audio recording
    const progressInterval = setInterval(() => {
      setCaptureProgress(prev => {
        const newProgress = prev + (100 / (duration * 10));
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    try {
      const result = await audioManager.recordAndAnalyze('cough');
      clearInterval(progressInterval);
      setCaptureProgress(100);
      setCaptureData(result);
      onComplete(result);
    } catch (err) {
      clearInterval(progressInterval);
      throw err;
    } finally {
      setIsCapturing(false);
    }
  };

  const simulateCaptureProgress = () => {
    const progressInterval = setInterval(() => {
      setCaptureProgress(prev => {
        const newProgress = prev + (100 / (duration * 2));
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          handleCameraComplete();
          return 100;
        }
        return newProgress;
      });
    }, 500);
  };

  const handleCameraComplete = (result?: any) => {
    setIsCapturing(false);
    setCaptureData(result || { simulated: true });
    onComplete(result || { simulated: true });
  };

  const handleCameraError = (errorMsg: string) => {
    setError(errorMsg);
    setIsCapturing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.instructions}>{instructions}</Text>

      {sensorType === 'camera' && !isCapturing && !captureData && (
        <CameraModule
          captureType="face"
          onCapture={handleCameraComplete}
          onError={handleCameraError}
          autoCapture={true}
        />
      )}

      {sensorType === 'audio' && (
        <View style={styles.audioContainer}>
          <View style={styles.audioVisualizer}>
            {isCapturing && (
              <View style={[styles.progressBar, { width: `${captureProgress}%` }]} />
            )}
          </View>
          
          {!isCapturing && !captureData && (
            <TouchableOpacity style={styles.captureButton} onPress={startCapture}>
              <Text style={styles.captureButtonText}>Start Recording</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isCapturing && (
        <View style={styles.captureInProgress}>
          <Text style={styles.captureText}>
            {sensorType === 'audio' ? 'Recording...' : 'Capturing...'}
          </Text>
          <Text style={styles.progressText}>{Math.round(captureProgress)}%</Text>
        </View>
      )}

      {captureData && (
        <View style={styles.captureComplete}>
          <Text style={styles.successText}>✓ Capture Complete</Text>
          <Text style={styles.qualityText}>
            Quality: {captureData.confidence ? `${Math.round(captureData.confidence * 100)}%` : 'Good'}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        {captureData && (
          <TouchableOpacity style={styles.continueButton} onPress={() => onComplete(captureData)}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22
  },
  audioContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  audioVisualizer: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 2
  },
  captureButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  captureInProgress: {
    alignItems: 'center',
    marginVertical: 20
  },
  captureText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 8
  },
  progressText: {
    fontSize: 16,
    color: '#666'
  },
  captureComplete: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 8
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 8
  },
  qualityText: {
    fontSize: 14,
    color: '#666'
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    marginBottom: 12,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 20
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6
  },
  backButtonText: {
    color: '#666',
    fontSize: 14
  },
  continueButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6
  },
  continueButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
