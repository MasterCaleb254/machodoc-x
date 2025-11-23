import { BatteryState, getBatteryLevelAsync, getPowerStateAsync } from 'expo-battery';
import { Platform } from 'react-native';

export interface BatteryStatus {
  level: number;
  state: BatteryState;
  isCharging: boolean;
  thermal: 'normal' | 'warning' | 'critical';
  lowPowerMode: boolean;
}

export class BatteryOptimizer {
  private static instance: BatteryOptimizer;
  private currentStatus: BatteryStatus | null = null;
  private sessionStartLevel: number = 0;
  private sessionStartTime: number = 0;

  static getInstance(): BatteryOptimizer {
    if (!BatteryOptimizer.instance) {
      BatteryOptimizer.instance = new BatteryOptimizer();
    }
    return BatteryOptimizer.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.updateBatteryStatus();
      
      // Set up periodic battery monitoring
      setInterval(() => {
        this.updateBatteryStatus();
      }, 30000); // Update every 30 seconds

      console.log('Battery optimizer initialized');
    } catch (error) {
      console.error('Battery optimizer initialization failed:', error);
      throw error;
    }
  }

  private async updateBatteryStatus(): Promise<void> {
    try {
      const batteryLevel = await getBatteryLevelAsync();
      const powerState = await getPowerStateAsync();
      
      this.currentStatus = {
        level: batteryLevel,
        state: powerState.batteryState,
        isCharging: powerState.batteryState === BatteryState.CHARGING || 
                   powerState.batteryState === BatteryState.FULL,
        thermal: this.getThermalStatus(),
        lowPowerMode: powerState.lowPowerMode || false
      };

    } catch (error) {
      console.error('Failed to update battery status:', error);
    }
  }

  async getBatteryLevel(): Promise<number> {
    if (!this.currentStatus) {
      await this.updateBatteryStatus();
    }
    return this.currentStatus?.level || 1.0;
  }

  async isCharging(): Promise<boolean> {
    if (!this.currentStatus) {
      await this.updateBatteryStatus();
    }
    return this.currentStatus?.isCharging || false;
  }

  async getThermalStatus(): Promise<'normal' | 'warning' | 'critical'> {
    // This would integrate with device thermal APIs
    // For now, return mock status
    return 'normal';
  }

  async startSession(): Promise<void> {
    this.sessionStartLevel = await this.getBatteryLevel();
    this.sessionStartTime = Date.now();
  }

  async calculateSessionImpact(): Promise<number> {
    const endLevel = await this.getBatteryLevel();
    const impact = (this.sessionStartLevel - endLevel) * 100;
    
    return Math.max(0, impact);
  }

  async isOperationAllowed(): Promise<boolean> {
    const batteryLevel = await this.getBatteryLevel();
    const thermalStatus = await this.getThermalStatus();
    const isCharging = await this.isCharging();

    // Basic checks for operation allowance
    if (batteryLevel < 0.15 && !isCharging) return false;
    if (thermalStatus === 'critical') return false;

    return true;
  }

  getOptimalCaptureStrategy(batteryLevel: number): 'aggressive' | 'balanced' | 'conservative' {
    if (batteryLevel > 0.7) return 'aggressive';
    if (batteryLevel > 0.4) return 'balanced';
    return 'conservative';
  }

  getRecommendedSettings(batteryLevel: number): {
    parallelOperations: boolean;
    highQualityCapture: boolean;
    backgroundProcessing: boolean;
  } {
    const strategy = this.getOptimalCaptureStrategy(batteryLevel);
    
    switch (strategy) {
      case 'aggressive':
        return {
          parallelOperations: true,
          highQualityCapture: true,
          backgroundProcessing: true
        };
      case 'balanced':
        return {
          parallelOperations: true,
          highQualityCapture: false,
          backgroundProcessing: false
        };
      case 'conservative':
        return {
          parallelOperations: false,
          highQualityCapture: false,
          backgroundProcessing: false
        };
    }
  }

  async scheduleBatteryIntensiveTask(task: () => Promise<void>): Promise<void> {
    const batteryLevel = await this.getBatteryLevel();
    const isCharging = await this.isCharging();

    if (batteryLevel < 0.3 && !isCharging) {
      // Delay task until charging or better conditions
      console.log('Delaying battery intensive task due to low battery');
      return;
    }

    await task();
  }

  getBatteryHealthTips(): string[] {
    const tips: string[] = [];
    
    if (this.currentStatus) {
      if (this.currentStatus.level < 0.3) {
        tips.push('Low battery - consider charging device');
      }
      
      if (this.currentStatus.lowPowerMode) {
        tips.push('Low power mode enabled - some features may be limited');
      }
      
      if (this.currentStatus.thermal === 'warning') {
        tips.push('Device is warm - consider closing other apps');
      }
    }

    return tips;
  }
}
