import * as tf from '@tensorflow/tfjs';
import { ModelManager, InferenceResult } from './ModelManager';

export interface FacialLandmark {
  x: number;
  y: number;
  confidence: number;
}

export interface FacialAnalysis {
  landmarks: FacialLandmark[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  symmetry: {
    face: number;
    eyes: number;
    mouth: number;
    eyebrows: number;
  };
  strokeAsymmetry: number;
  facialFeatures: {
    eyeOpenness: number;
    mouthOpenness: number;
    eyebrowRaise: number;
  };
}

export class FacialLandmarkDetector {
  private static instance: FacialLandmarkDetector;
  private modelManager: ModelManager;
  private modelId = 'facial_landmarks';
  private inputSize = 192;
  private numLandmarks = 68;

  // Landmark indices for different facial features
  private landmarkIndices = {
    jaw: [0, 16],
    rightEyebrow: [17, 21],
    leftEyebrow: [22, 26],
    nose: [27, 35],
    rightEye: [36, 41],
    leftEye: [42, 47],
    mouth: [48, 67]
  };

  private constructor() {
    this.modelManager = ModelManager.getInstance();
  }

  static getInstance(): FacialLandmarkDetector {
    if (!FacialLandmarkDetector.instance) {
      FacialLandmarkDetector.instance = new FacialLandmarkDetector();
    }
    return FacialLandmarkDetector.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.modelManager.loadModel(this.modelId);
      console.log('Facial landmark detector initialized');
    } catch (error) {
      console.error('Failed to initialize facial landmark detector:', error);
      throw error;
    }
  }

  async detectLandmarks(imageTensor: tf.Tensor3D): Promise<FacialAnalysis> {
    try {
      // Preprocess image
      const inputTensor = await this.preprocessImage(imageTensor);
      
      // Run inference
      const result = await this.modelManager.runInference(this.modelId, inputTensor);
      
      // Postprocess results
      const analysis = await this.postprocessOutput(result.output, imageTensor);
      
      // Clean up tensors
      inputTensor.dispose();

      return analysis;

    } catch (error) {
      console.error('Facial landmark detection failed:', error);
      throw error;
    }
  }

  private async preprocessImage(imageTensor: tf.Tensor3D): Promise<tf.Tensor> {
    // Resize to model input size
    const resized = tf.image.resizeBilinear(imageTensor, [this.inputSize, this.inputSize]);
    
    // Normalize pixel values to [-1, 1]
    const normalized = resized.div(127.5).sub(1);
    
    // Add batch dimension
    return normalized.expandDims(0);

    if (!(output instanceof tf.Tensor)) {
      throw new Error('Expected tensor output from facial landmark detector');
    }

    const [originalHeight, originalWidth] = originalImage.shape;
    const outputData = await output.data();
    
    // Extract landmarks
    const landmarks = this.extractLandmarks(outputData, originalWidth, originalHeight);
    
    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(landmarks);
    
    // Analyze symmetry
    const symmetry = this.analyzeSymmetry(landmarks);
    
    // Calculate stroke asymmetry
    const strokeAsymmetry = this.calculateStrokeAsymmetry(landmarks, symmetry);
    
    // Extract facial features
    const facialFeatures = this.extractFacialFeatures(landmarks);

    return {
      landmarks,
      boundingBox,
      symmetry,
      strokeAsymmetry,
      facialFeatures
    };
  }

  private extractLandmarks(outputData: Float32Array, imageWidth: number, imageHeight: number): FacialLandmark[] {
    const landmarks: FacialLandmark[] = [];
    
    for (let i = 0; i < this.numLandmarks; i++) {
      const x = outputData[i * 2] * imageWidth;
      const y = outputData[i * 2 + 1] * imageHeight;
      
      // Calculate confidence based on position validity
      const confidence = this.calculateLandmarkConfidence(x, y, imageWidth, imageHeight);
      
      landmarks.push({ x, y, confidence });
    }
    
    return landmarks;
  }

  private calculateLandmarkConfidence(x: number, y: number, width: number, height: number): number {
    // Check if landmark is within image bounds
    const inBounds = x >= 0 && x <= width && y >= 0 && y <= height;
    
    // Simple confidence calculation
    let confidence = inBounds ? 0.8 : 0.3;
    
    // Add some random variation for demo
    confidence += (Math.random() * 0.2 - 0.1);
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  private calculateBoundingBox(landmarks: FacialLandmark[]): FacialAnalysis['boundingBox'] {
    const xs = landmarks.map(l => l.x);
    const ys = landmarks.map(l => l.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private analyzeSymmetry(landmarks: FacialLandmark[]): FacialAnalysis['symmetry'] {
    // Calculate symmetry for different facial features
    return {
      face: this.calculateFaceSymmetry(landmarks),
      eyes: this.calculateEyeSymmetry(landmarks),
      mouth: this.calculateMouthSymmetry(landmarks),
      eyebrows: this.calculateEyebrowSymmetry(landmarks)
    };
  }

  private calculateFaceSymmetry(landmarks: FacialLandmark[]): number {
    const leftPoints = landmarks.slice(0, 8); // Left side of face
    const rightPoints = landmarks.slice(8, 16); // Right side of face
    
    return this.calculateMirrorSymmetry(leftPoints, rightPoints);
  }

  private calculateEyeSymmetry(landmarks: FacialLandmark[]): number {
    const leftEye = landmarks.slice(36, 42);
    const rightEye = landmarks.slice(42, 48);
    
    return this.calculateMirrorSymmetry(leftEye, rightEye);
  }

  private calculateMouthSymmetry(landmarks: FacialLandmark[]): number {
    const mouthPoints = landmarks.slice(48, 68);
    const leftHalf = mouthPoints.slice(0, 5);
    const rightHalf = mouthPoints.slice(5, 10);
    
    return this.calculateMirrorSymmetry(leftHalf, rightHalf);
  }

  private calculateEyebrowSymmetry(landmarks: FacialLandmark[]): number {
    const leftEyebrow = landmarks.slice(17, 22);
    const rightEyebrow = landmarks.slice(22, 27);
    
    return this.calculateMirrorSymmetry(leftEyebrow, rightEyebrow);
  }

  private calculateMirrorSymmetry(leftPoints: FacialLandmark[], rightPoints: FacialLandmark[]): number {
    if (leftPoints.length !== rightPoints.length) return 0.5;
    
    let totalDistance = 0;
    let maxPossibleDistance = 0;
    
    for (let i = 0; i < leftPoints.length; i++) {
      const left = leftPoints[i];
      const right = rightPoints[i];
      
      // Calculate vertical alignment difference
      const verticalDiff = Math.abs(left.y - right.y);
      totalDistance += verticalDiff;
      
      // Estimate max possible difference based on face size
      const estimatedFaceHeight = Math.abs(leftPoints[0].y - leftPoints[leftPoints.length - 1].y);
      maxPossibleDistance += estimatedFaceHeight * 0.1; // 10% of face height
    }
    
    const avgDistance = totalDistance / leftPoints.length;
    const symmetry = 1 - (avgDistance / (maxPossibleDistance / leftPoints.length));
    
    return Math.max(0, Math.min(1, symmetry));
  }

  private calculateStrokeAsymmetry(landmarks: FacialLandmark[], symmetry: FacialAnalysis['symmetry']): number {
    // Stroke often causes facial asymmetry
    const weights = {
      face: 0.4,
      eyes: 0.3,
      mouth: 0.2,
      eyebrows: 0.1
    };
    
    const totalAsymmetry = 
      (1 - symmetry.face) * weights.face +
      (1 - symmetry.eyes) * weights.eyes +
      (1 - symmetry.mouth) * weights.mouth +
      (1 - symmetry.eyebrows) * weights.eyebrows;
    
    return Math.min(1, totalAsymmetry * 2); // Scale to make clinically relevant
  }

  private extractFacialFeatures(landmarks: FacialLandmark[]): FacialAnalysis['facialFeatures'] {
    return {
      eyeOpenness: this.calculateEyeOpenness(landmarks),
      mouthOpenness: this.calculateMouthOpenness(landmarks),
      eyebrowRaise: this.calculateEyebrowRaise(landmarks)
    };
  }

  private calculateEyeOpenness(landmarks: FacialLandmark[]): number {
    const leftEyeHeight = Math.abs(landmarks[37].y - landmarks[41].y);
    const rightEyeHeight = Math.abs(landmarks[43].y - landmarks[47].y);
    
    const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
    const faceHeight = Math.abs(landmarks[8].y - landmarks[27].y); // Chin to nose
    
    // Normalize by face height
    return Math.min(1, avgEyeHeight / faceHeight * 10);
  }

  private calculateMouthOpenness(landmarks: FacialLandmark[]): number {
    const mouthHeight = Math.abs(landmarks[51].y - landmarks[57].y);
    const faceHeight = Math.abs(landmarks[8].y - landmarks[27].y);
    
    return Math.min(1, mouthHeight / faceHeight * 5);
  }

  private calculateEyebrowRaise(landmarks: FacialLandmark[]): number {
    const leftEyebrowAvgY = landmarks.slice(17, 22).reduce((sum, l) => sum + l.y, 0) / 5;
    const rightEyebrowAvgY = landmarks.slice(22, 27).reduce((sum, l) => sum + l.y, 0) / 5;
    
    const eyeAvgY = (landmarks[37].y + landmarks[41].y + landmarks[43].y + landmarks[47].y) / 4;
    
    const leftRaise = Math.max(0, eyeAvgY - leftEyebrowAvgY);
    const rightRaise = Math.max(0, eyeAvgY - rightEyebrowAvgY);
    
    return (leftRaise + rightRaise) / 2;
  }

  async detectFromImageData(imageData: ImageData): Promise<FacialAnalysis> {
    const tensor = tf.browser.fromPixels(imageData);
    const result = await this.detectLandmarks(tensor);
    tensor.dispose();
    return result;
  }
}  private async postprocessOutput(output: tf.Tensor | tf.Tensor[], originalImage: tf.Tensor3D): Promise<FacialAnalysis> {

