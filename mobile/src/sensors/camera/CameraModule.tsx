import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { useIsForeground } from './hooks/useIsForeground';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface CaptureResult {
  path: string;
  width: number;
  height: number;
  timestamp: number;
  type: 'face' | 'skin' | 'urine' | 'wound';
  metadata: {
    flash: boolean;
    exposure: number;
    whiteBalance: string;
  };
}

interface CameraModuleProps {
  captureType: 'face' | 'skin' | 'urine' | 'wound';
  onCapture: (result: CaptureResult) => void;
  onError: (error: string) => void;
  autoCapture?: boolean;
  processingCallback?: (processing: boolean) => void;
}

export const CameraModule: React.FC<CameraModuleProps> = ({
  captureType,
  onCapture,
  onError,
  autoCapture = false,
  processingCallback
}) => {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const isForeground = useIsForeground();
  const [isActive, setIsActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Camera configuration based on capture type
  const format = useCameraFormat(device, [
    { photoAspectRatio: 4 / 3 },
    { photoResolution: { width: 1920, height: 1080 } },
    { fps: 30 }
  ]);

  useEffect(() => {
    processingCallback?.(isProcessing);
  }, [isProcessing, processingCallback]);

  if (!device) {
    onError('Camera device not found');
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera not available</Text>
      </View>
    );
  }

  const takePhoto = async (): Promise<void> => {
    if (!camera.current || isProcessing) return;

    try {
      setIsProcessing(true);
      
      const photo = await camera.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality',
        skipMetadata: false,
        enableAutoStabilization: true
      });

      const result: CaptureResult = {
        path: `file://${photo.path}`,
        width: photo.width,
        height: photo.height,
        timestamp: Date.now(),
        type: captureType,
        metadata: {
          flash: false,
          exposure: 0, // Would extract from EXIF in real implementation
          whiteBalance: 'auto'
      onCapture(processedResult);
        }

    } catch (error) {
      console.error('Error taking photo:', error);
      onError(`Failed to capture image: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const processImageForType = async (result: CaptureResult, type: string): Promise<CaptureResult> => {
    // Different processing based on image type
    switch (type) {
      case 'face':
        return await processFacialImage(result);
      case 'skin':
        return await processSkinImage(result);
      case 'urine':
        return await processUrineStripImage(result);
      case 'wound':
        return await processWoundImage(result);
      default:
        return result;
    }
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        photo={true}
        isActive={isActive && isForeground}
        enableZoomGesture={true}
        orientation="portrait"
      />
      
      {/* Capture overlay with guidelines */}
      <View style={styles.overlay}>
        <View style={[
          styles.guideline,
          captureType === 'face' ? styles.faceGuideline : 
          captureType === 'urine' ? styles.urineGuideline : styles.defaultGuideline
        ]} />
        
        {/* Capture button */}
        {!autoCapture && (
          <TouchableOpacity 
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={takePhoto}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status indicator */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Processing image...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideline: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
  },
  faceGuideline: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
  },
  urineGuideline: {
    width: screenWidth * 0.5,
    height: screenWidth * 0.3,
  },
  defaultGuideline: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.6,
  },
  captureButton: {
    position: 'absolute',
    bottom: 50,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});    } finally {
      const processedResult = await processImageForType(result, captureType);
      // Process the image based on capture type

