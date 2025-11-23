import * as tf from '@tensorflow/tfjs';
import { ModelConfig } from './ModelManager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    inferenceTime: number;
    memoryUsage: number;
    accuracy: number;
  };
}

export class ModelValidator {
  private static instance: ModelValidator;

  static getInstance(): ModelValidator {
    if (!ModelValidator.instance) {
      ModelValidator.instance = new ModelValidator();
    }
    return ModelValidator.instance;
  }

  async validateModel(model: tf.LayersModel, config: ModelConfig): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      performance: {
        inferenceTime: 0,
        memoryUsage: 0,
        accuracy: 0
      }
    };

    try {
      // Validate model structure
      await this.validateModelStructure(model, config, result);

      // Validate input/output shapes
      await this.validateShapes(model, config, result);

      // Performance testing
      await this.performanceTest(model, config, result);

      // Memory usage check
      await this.checkMemoryUsage(model, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${error.message}`);
    }

    return result;
  }

  private async validateModelStructure(
    model: tf.LayersModel, 
    config: ModelConfig, 
    result: ValidationResult
  ): Promise<void> {
    try {
      // Check if model has layers
      const layers = model.layers;
      if (!layers || layers.length === 0) {
        result.errors.push('Model has no layers');
        result.isValid = false;
        return;
      }

      // Check input layer
      const inputLayers = model.inputs;
      if (!inputLayers || inputLayers.length === 0) {
        result.errors.push('Model has no input layers');
        result.isValid = false;
      }

      // Check output layer
      const outputLayers = model.outputs;
      if (!outputLayers || outputLayers.length === 0) {
        result.errors.push('Model has no output layers');
        result.isValid = false;
      }

      // Check for unsupported operations
      await this.checkUnsupportedOperations(model, result);

    } catch (error) {
      result.errors.push(`Structure validation failed: ${error.message}`);
      result.isValid = false;
    }
  }

  private async validateShapes(
    model: tf.LayersModel, 
    config: ModelConfig, 
    result: ValidationResult
  ): Promise<void> {
    try {
      // Test with dummy input matching expected shape
      const dummyInput = this.createDummyInput(config.inputShape);
      
      const output = model.predict(dummyInput);
      const outputShape = this.getOutputShape(output);

      // Validate output shape
      if (!this.shapesMatch(outputShape, config.outputShape)) {
        result.errors.push(
          `Output shape mismatch. Expected: [${config.outputShape}], Got: [${outputShape}]`
        );
        result.isValid = false;
      }

      // Clean up
      dummyInput.dispose();
      if (output instanceof tf.Tensor) {
        output.dispose();
      } else if (Array.isArray(output)) {
        output.forEach(tensor => tensor.dispose());
      }

    } catch (error) {
      result.errors.push(`Shape validation failed: ${error.message}`);
      result.isValid = false;
    }
  }

  private async performanceTest(
    model: tf.LayersModel, 
    config: ModelConfig, 
    result: ValidationResult
  ): Promise<void> {
    const warmupRuns = 3;
    const testRuns = 10;
    const dummyInput = this.createDummyInput(config.inputShape);

    try {
      // Warmup runs
      for (let i = 0; i < warmupRuns; i++) {
        const warmupOutput = model.predict(dummyInput);
        if (warmupOutput instanceof tf.Tensor) {
          warmupOutput.dispose();
        }
      }

      // Performance test runs
      const times: number[] = [];
      for (let i = 0; i < testRuns; i++) {
        const startTime = Date.now();
        const testOutput = model.predict(dummyInput);
        const inferenceTime = Date.now() - startTime;
        times.push(inferenceTime);

        if (testOutput instanceof tf.Tensor) {
          testOutput.dispose();
        }
      }

      // Calculate statistics
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      result.performance.inferenceTime = avgTime;

      // Check against expected performance
      if (avgTime > config.performance.latency * 2) {
        result.warnings.push(
          `Model inference time (${avgTime.toFixed(2)}ms) exceeds expected performance (${config.performance.latency}ms)`
        );
      }

      console.log(`Performance test: avg=${avgTime.toFixed(2)}ms, min=${minTime}ms, max=${maxTime}ms`);

    } catch (error) {
      result.warnings.push(`Performance test failed: ${error.message}`);
    } finally {
      dummyInput.dispose();
    }
  }

  private async checkMemoryUsage(model: tf.LayersModel, result: ValidationResult): Promise<void> {
    try {
      const initialMemory = tf.memory().numTensors;
      
      // Run a prediction to allocate model weights
      const dummyInput = tf.ones([1, 10, 10, 3]); // Small input
      const output = model.predict(dummyInput);
      
      const memoryAfter = tf.memory().numTensors;
      const memoryUsed = memoryAfter - initialMemory;

      result.performance.memoryUsage = memoryUsed;

      if (memoryUsed > 100) {
        result.warnings.push(`High memory usage: ${memoryUsed} tensors allocated`);
      }

      // Clean up
      dummyInput.dispose();
      if (output instanceof tf.Tensor) {
        output.dispose();
      }
  }

  private async checkUnsupportedOperations(model: tf.LayersModel, result: ValidationResult): Promise<void> {
    // Check for operations that might not be well-supported on mobile
    const unsupportedOps = [
      'lstm', 'gru', 'bidirectional', 'conv3d', 'maxpooling3d'
    ];

    for (const layer of model.layers) {
      const layerType = layer.getClassName().toLowerCase();
      
      if (unsupportedOps.some(op => layerType.includes(op))) {
        result.warnings.push(`Layer type ${layerType} may have performance issues on mobile`);
      }
    }
  }

  private createDummyInput(shape: number[]): tf.Tensor {
    // Remove batch dimension for tensor creation
    const tensorShape = shape.slice(1);
    return tf.ones(tensorShape).expandDims(0);
  }

  private getOutputShape(output: tf.Tensor | tf.Tensor[]): number[] {
    if (output instanceof tf.Tensor) {
      return output.shape;
    } else if (Array.isArray(output) && output.length > 0) {
      return output[0].shape;
    }
    return [];
  }

  private shapesMatch(shape1: number[], shape2: number[]): boolean {
    if (shape1.length !== shape2.length) return false;
    
    for (let i = 0; i < shape1.length; i++) {
      if (shape1[i] !== shape2[i] && shape2[i] !== -1) {
        return false;
      }
    }
    
    return true;
  }

  validateInputData(input: tf.Tensor, expectedShape: number[]): string[] {
    const errors: string[] = [];
    const actualShape = input.shape;

    // Check rank
    if (actualShape.length !== expectedShape.length) {
      errors.push(`Rank mismatch. Expected: ${expectedShape.length}, Got: ${actualShape.length}`);
      return errors;
    }

    // Check dimensions
    for (let i = 0; i < expectedShape.length; i++) {
      if (expectedShape[i] !== -1 && actualShape[i] !== expectedShape[i]) {
        errors.push(`Dimension ${i} mismatch. Expected: ${expectedShape[i]}, Got: ${actualShape[i]}`);
      }
    }

    // Check data type (optional, but good practice)
    if (input.dtype !== 'float32') {
      errors.push(`Expected float32 data type, got: ${input.dtype}`);
    }

    return errors;
  }
}    }
    } catch (error) {
      result.warnings.push(`Memory check failed: ${error.message}`);

