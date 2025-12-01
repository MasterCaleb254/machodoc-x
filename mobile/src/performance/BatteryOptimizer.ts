import { BatteryState, getPowerStateAsync } from 'expo-battery';
import { BehaviorSubject } from 'rxjs';

export interface BatteryState {
  batteryLevel: number;
  batteryState: BatteryState;
  lowPowerMode: boolean;
}

export class BatteryOptimizer {
  private static instance: BatteryOptimizer;
  private batteryState = new BehaviorSubject<BatteryState | null>(null);
  private isMonitoring = false;

  private readonly OPTIMIZATION_STRATEGIES = {
    LOW_BATTERY: {
      sensorCapture: {
        reduceQuality: true,
        limitDuration: true,
        skipOptionalSensors: true
      },
      mlInference: {
        useQuantizedModels: true,
        skipNonCritical: true
      },
      sync: {
        deferNonCritical: true,
        reduceFrequency: true
      }
    },
    CRITICAL_BATTERY: {
      sensorCapture: {
        reduceQuality: true,
        limitDuration: true,
        skipOptionalSensors: true,
        minimumSensorsOnly: true
      },
      mlInference: {
        useQuantizedModels: true,
        skipNonCritical: true,
        minimumModelsOnly: true
      },
      sync: {
        deferNonCritical: true,
        reduceFrequency: true,
        offlineOnly: true
      }
    }
  };

  private constructor() {}

  static getInstance(): BatteryOptimizer {
    if (!BatteryOptimizer.instance) {
      BatteryOptimizer.instance = new BatteryOptimizer();
    }
    return BatteryOptimizer.instance;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    await this.updateBatteryState();

    // Update battery state every 30 seconds
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }
      await this.updateBatteryState();
    }, 30000);

    console.log('Battery monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Battery monitoring stopped');
  }

  private async updateBatteryState(): Promise<void> {
    try {
      const powerState = await getPowerStateAsync();
      const state: BatteryState = {
        batteryLevel: powerState.batteryLevel,
        batteryState: powerState.batteryState,
        lowPowerMode: powerState.lowPowerMode
      };

      this.batteryState.next(state);
    } catch (error) {
      console.error('Failed to update battery state:', error);
    }
  }

  getBatteryState(): BehaviorSubject<BatteryState | null> {
    return this.batteryState;
  }

  getOptimizationStrategy(): any {
    const state = this.batteryState.value;
    if (!state) return {};

    if (state.batteryLevel < 0.1 || state.lowPowerMode) {
      return this.OPTIMIZATION_STRATEGIES.CRITICAL_BATTERY;
    } else if (state.batteryLevel < 0.2) {
      return this.OPTIMIZATION_STRATEGIES.LOW_BATTERY;
    }

    return {}; // No optimizations needed
  }

  shouldOptimizeForBattery(): boolean {
    const state = this.batteryState.value;
    if (!state) return false;

    return state.batteryLevel < 0.2 || state.lowPowerMode;
  }

  // Method to apply battery optimizations to specific operations
  applyOptimizations(operationType: string, config: any): any {
    const strategy = this.getOptimizationStrategy();

    if (!strategy[operationType]) {
      return config;
    }

    const optimizations = strategy[operationType];
    const optimizedConfig = { ...config };

    if (optimizations.reduceQuality) {
      optimizedConfig.quality = Math.min(optimizedConfig.quality || 1, 0.7);
    }

    if (optimizations.limitDuration) {
      optimizedConfig.duration = Math.min(optimizedConfig.duration || 30, 10);
    }

    if (optimizations.skipOptionalSensors) {
      optimizedConfig.requiredSensorsOnly = true;
    }

    if (optimizations.useQuantizedModels) {
      optimizedConfig.quantized = true;
    }

    if (optimizations.skipNonCritical) {
      optimizedConfig.criticalOnly = true;
    }

    return optimizedConfig;
  }
}
