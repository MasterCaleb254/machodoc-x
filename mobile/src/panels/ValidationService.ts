import { ValidationRule } from './PanelConfig';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ValidationService {
  private static instance: ValidationService;

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  async validateStepOutput(output: any, rules: ValidationRule[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const rule of rules) {
      const fieldValue = this.getFieldValue(output, rule.field);
      const validation = this.validateField(fieldValue, rule);

      if (!validation.isValid) {
        result.isValid = false;
        result.errors.push(validation.error || rule.errorMessage);
      } else if (validation.warning) {
        result.warnings.push(validation.warning);
      }
    }

    return result;
  }

  private getFieldValue(data: any, fieldPath: string): any {
    const path = fieldPath.split('.');
    let current = data;

    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private validateField(value: any, rule: ValidationRule): { isValid: boolean; error?: string; warning?: string } {
    switch (rule.condition) {
      case 'required':
        return this.validateRequired(value, rule);
      case 'min':
        return this.validateMin(value, rule);
      case 'max':
        return this.validateMax(value, rule);
      case 'range':
        return this.validateRange(value, rule);
      case 'pattern':
        return this.validatePattern(value, rule);
      default:
        return { isValid: true, warning: `Unknown validation rule: ${rule.condition}` };
    }
  }

  private validateRequired(value: any, rule: ValidationRule): { isValid: boolean; error?: string } {
    const isValid = value !== undefined && value !== null && value !== '';
    return {
      isValid,
      error: isValid ? undefined : rule.errorMessage
    };
  }

  private validateMin(value: any, rule: ValidationRule): { isValid: boolean; error?: string } {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required rule handle missing values
    }

    const numValue = Number(value);
    const minValue = Number(rule.value);

    const isValid = !isNaN(numValue) && numValue >= minValue;
    return {
      isValid,
      error: isValid ? undefined : rule.errorMessage
    };
  }

  private validateMax(value: any, rule: ValidationRule): { isValid: boolean; error?: string } {
    if (value === undefined || value === null) {
      return { isValid: true };
    }

    const numValue = Number(value);
    const maxValue = Number(rule.value);

    const isValid = !isNaN(numValue) && numValue <= maxValue;
    return {
      isValid,
      error: isValid ? undefined : rule.errorMessage
    };
  }

  private validateRange(value: any, rule: ValidationRule): { isValid: boolean; error?: string } {
    if (value === undefined || value === null) {
      return { isValid: true };
    }

    const numValue = Number(value);
    const [minValue, maxValue] = rule.value.map(Number);

    const isValid = !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;
    return {
      isValid,
      error: isValid ? undefined : rule.errorMessage
    };
  }

  private validatePattern(value: any, rule: ValidationRule): { isValid: boolean; error?: string } {
    if (value === undefined || value === null) {
      return { isValid: true };
    }

    const stringValue = String(value);
    const pattern = new RegExp(rule.value);

    const isValid = pattern.test(stringValue);
    return {
      isValid,
      error: isValid ? undefined : rule.errorMessage
    };
  }

  validateSensorDataQuality(sensorData: any, threshold: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check basic data quality metrics
    if (sensorData.qualityScore !== undefined && sensorData.qualityScore < threshold) {
      result.isValid = false;
      result.errors.push(`Sensor data quality below threshold: ${sensorData.qualityScore} < ${threshold}`);
    }

    if (sensorData.timestamp && Date.now() - sensorData.timestamp > 300000) { // 5 minutes
      result.warnings.push('Sensor data is older than 5 minutes');
    }

    return result;
  }

  validateMLOutput(output: any, expectedFormat: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if output has expected structure
    for (const [key, expectedType] of Object.entries(expectedFormat)) {
      if (!(key in output)) {
        result.errors.push(`Missing expected field: ${key}`);
        result.isValid = false;
        continue;
      }

      const actualValue = output[key];
      const typeCheck = this.checkType(actualValue, expectedType);

      if (!typeCheck.isValid) {
        result.errors.push(`Type mismatch for ${key}: ${typeCheck.error}`);
        result.isValid = false;
      }
    }

    return result;
  }

  private checkType(value: any, expectedType: string): { isValid: boolean; error?: string } {
    const typeMap: Record<string, string> = {
      'number': 'number',
      'string': 'string',
      'boolean': 'boolean',
      'array': 'object',
      'object': 'object'
    };

    const expectedJsType = typeMap[expectedType] || expectedType;

    if (expectedType === 'array' && !Array.isArray(value)) {
      return { isValid: false, error: `Expected array, got ${typeof value}` };
    }

    if (expectedJsType === 'object' && Array.isArray(value)) {
      return { isValid: false, error: 'Expected object, got array' };
    }

    if (typeof value !== expectedJsType && expectedType !== 'array') {
      return { isValid: false, error: `Expected ${expectedType}, got ${typeof value}` };
    }

    return { isValid: true };
  }

  validateFusionResult(fusionResult: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required fusion result fields
    const requiredFields = ['conditions', 'riskScores', 'recommendations', 'urgency', 'confidence'];
    
    for (const field of requiredFields) {
      if (!fusionResult[field]) {
        result.errors.push(`Missing required fusion field: ${field}`);
        result.isValid = false;
      }
    }

    // Validate conditions array
    if (fusionResult.conditions && Array.isArray(fusionResult.conditions)) {
      if (fusionResult.conditions.length === 0) {
        result.warnings.push('No conditions identified in fusion result');
      }

      for (const condition of fusionResult.conditions) {
        if (!condition.probability || condition.probability < 0 || condition.probability > 1) {
          result.errors.push('Invalid probability in condition');
          result.isValid = false;
        }
      }
    }

    // Validate confidence score
    if (fusionResult.confidence !== undefined) {
      if (fusionResult.confidence < 0 || fusionResult.confidence > 1) {
        result.errors.push('Confidence score must be between 0 and 1');
        result.isValid = false;
      } else if (fusionResult.confidence < 0.3) {
        result.warnings.push('Low confidence in fusion result');
      }
    }

    return result;
  }

  validatePanelCompletion(panelResult: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if all required steps are completed
    if (!panelResult.steps) {
      result.errors.push('No step results available');
      result.isValid = false;
      return result;
    }

    const failedSteps = Object.values(panelResult.steps).filter((step: any) => 
      step.status === 'failed'
    );

    if (failedSteps.length > 0) {
      result.warnings.push(`${failedSteps.length} steps failed during panel execution`);
    }

    // Check overall quality
    if (panelResult.quality && panelResult.quality.overall < 0.5) {
      result.warnings.push('Low overall quality score for panel results');
    }

    // Check data completeness
    if (panelResult.quality && panelResult.quality.dataCompleteness < 0.8) {
      result.warnings.push('Incomplete data collection for panel');
    }

    return result;
  }
}
