import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import { CaptureResult } from './CameraModule';

export interface ProcessedImage {
  originalPath: string;
  processedPath: string;
  features: ImageFeatures;
  qualityScore: number;
  processingTime: number;
}

export interface ImageFeatures {
  // Face analysis features
  facialLandmarks?: FacialLandmarks;
  skinTone?: SkinToneAnalysis;
  eyeMetrics?: EyeMetrics;
  symmetry?: SymmetryAnalysis;
  
  // Vitals from video
  heartRate?: number;
  respirationRate?: number;
  hrv?: number;
  
  // Urine strip analysis
  stripColors?: StripColorAnalysis;
  
  // General image quality
  brightness: number;
  contrast: number;
  sharpness: number;
  noise: number;
}

export interface FacialLandmarks {
  points: Array<{ x: number; y: number }>;
  boundingBox: { x: number; y: number; width: number; height: number };
  symmetryScore: number;
}

export interface SkinToneAnalysis {
  r: number;
  g: number;
  b: number;
  pallorScore: number;
  jaundiceScore: number;
  cyanosisScore: number;
}

export interface EyeMetrics {
  redness: number;
  pupilSize: number;
  pupilReactivity?: number;
  scleraColor: { r: number; g: number; b: number };
}

export interface SymmetryAnalysis {
  faceSymmetry: number;
  eyeSymmetry: number;
  mouthSymmetry: number;
  eyebrowSymmetry: number;
}

export interface StripColorAnalysis {
  protein: { r: number; g: number; b: number };
  glucose: { r: number; g: number; b: number };
  ketones: { r: number; g: number; b: number };
  leukocytes: { r: number; g: number; b: number };
  nitrates: { r: number; g: number; b: number };
  pH: { r: number; g: number; b: number };
}

export class ImageProcessor {
  private static instance: ImageProcessor;

  static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  async processImage(capture: CaptureResult): Promise<ProcessedImage> {
    const startTime = Date.now();
    
    try {
      // Step 1: Preprocess image
      const preprocessedPath = await this.preprocessImage(capture.path, capture.type);
      
      // Step 2: Extract features based on image type
      const features = await this.extractFeatures(preprocessedPath, capture.type);
      
      // Step 3: Calculate quality score
      const qualityScore = this.calculateQualityScore(features);
      
      const processingTime = Date.now() - startTime;

      return {
        originalPath: capture.path,
        processedPath: preprocessedPath,
        features,
        qualityScore,
        processingTime
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  private async preprocessImage(imagePath: string, type: string): Promise<string> {
    // Remove file:// prefix if present
    const cleanPath = imagePath.replace('file://', '');
    
    // Different preprocessing based on image type
    let targetWidth, targetHeight, quality;

    switch (type) {
      case 'face':
        targetWidth = 640;
        targetHeight = 640;
        quality = 90;
        break;
      case 'urine':
        targetWidth = 800;
        targetHeight = 600;
        quality = 95; // Higher quality for color accuracy
        break;
      case 'skin':
      case 'wound':
        targetWidth = 1024;
        targetHeight = 768;
        quality = 85;
        break;
      default:
        targetWidth = 800;
        targetHeight = 600;
        quality = 80;
    }

    try {
      const result = await ImageResizer.createResizedImage(
        cleanPath,
        targetWidth,
        targetHeight,
        'JPEG',
        quality,
        0, // rotation
        undefined, // outputPath - let it generate
        false, // keep metadata
        { mode: 'cover' } // only for cover
      );

      return result.uri;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      // Return original path if preprocessing fails
      return imagePath;
    }
  }

  private async extractFeatures(imagePath: string, type: string): Promise<ImageFeatures> {
    const baseFeatures: ImageFeatures = {
      brightness: 0.5,
      contrast: 0.5,
      sharpness: 0.5,
      noise: 0.1
    };

    try {
      switch (type) {
        case 'face':
          return {
            ...baseFeatures,
            ...await this.extractFacialFeatures(imagePath),
            ...await this.extractVitalsFromVideo(imagePath) // Would be different in reality
          };
        case 'skin':
          return {
            ...baseFeatures,
            ...await this.extractSkinFeatures(imagePath)
          };
        case 'urine':
          return {
            ...baseFeatures,
            ...await this.extractUrineStripFeatures(imagePath)
          };
        case 'wound':
          return {
            ...baseFeatures,
            ...await this.extractWoundFeatures(imagePath)
          };
        default:
          return baseFeatures;
      }
    } catch (error) {
      console.error('Feature extraction failed:', error);
      return baseFeatures;
    }
  }

  private async extractFacialFeatures(imagePath: string): Promise<Partial<ImageFeatures>> {
    // This would integrate with TensorFlow Lite models
    // For now, return mock data structure
    
    return {
      facialLandmarks: {
        points: Array(68).fill(0).map((_, i) => ({ x: i * 10, y: i * 8 })),
        boundingBox: { x: 100, y: 100, width: 400, height: 400 },
        symmetryScore: 0.85
      },
      skinTone: {
        r: 180, g: 140, b: 120,
        pallorScore: 0.2,
        jaundiceScore: 0.1,
        cyanosisScore: 0.05
      },
      eyeMetrics: {
        redness: 0.3,
        pupilSize: 4.2,
        scleraColor: { r: 255, g: 255, b: 240 }
      },
      symmetry: {
        faceSymmetry: 0.88,
        eyeSymmetry: 0.92,
        mouthSymmetry: 0.85,
        eyebrowSymmetry: 0.90
      }
    };
  }

  private async extractUrineStripFeatures(imagePath: string): Promise<Partial<ImageFeatures>> {
    // Mock urine strip color analysis
    return {
      stripColors: {
        protein: { r: 120, g: 180, b: 200 },
        glucose: { r: 200, g: 150, b: 100 },
        ketones: { r: 180, g: 120, b: 180 },
        leukocytes: { r: 150, g: 200, b: 150 },
        nitrates: { r: 200, g: 180, b: 120 },
        pH: { r: 100, g: 150, b: 200 }
      }
    };
  }

  private async extractSkinFeatures(imagePath: string): Promise<Partial<ImageFeatures>> {
    // Mock skin analysis
    return {

  private async extractWoundFeatures(imagePath: string): Promise<Partial<ImageFeatures>> {
    // Mock wound analysis
    return {
      // Wound-specific features would go here
    };
  }

  private async extractVitalsFromVideo(imagePath: string): Promise<Partial<ImageFeatures>> {
    // This would process video frames for PPG (Photoplethysmography)
    // Mock implementation
    return {
      heartRate: 72,
      respirationRate: 16,
      hrv: 45
    };
  }

  private calculateQualityScore(features: ImageFeatures): number {
    let score = 1.0;

    // Deduct for poor brightness
    if (features.brightness < 0.3 || features.brightness > 0.8) {
      score -= 0.3;
    }

    // Deduct for poor contrast
    if (features.contrast < 0.4) {
      score -= 0.2;
    }

    // Deduct for noise
    if (features.noise > 0.3) {
      score -= 0.2;
    }

    // Deduct for poor sharpness
    if (features.sharpness < 0.5) {
      score -= 0.2;
    }

    return Math.max(0.1, score);
  }

  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    try {
      for (const path of filePaths) {
        const cleanPath = path.replace('file://', '');
        if (await RNFS.exists(cleanPath)) {
          await RNFS.unlink(cleanPath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}    };
  }
      }
        cyanosisScore: 0.02
        jaundiceScore: 0.08,
      skinTone: {
        r: 190, g: 160, b: 140,
        pallorScore: 0.15,
