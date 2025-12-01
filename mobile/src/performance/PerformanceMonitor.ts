import { PerformanceObserver, performance } from 'react-native-performance';
import { BehaviorSubject } from 'rxjs';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  summary: {
    averageFrameTime: number;
    memoryUsage: number;
    batteryImpact: number;
    cpuUsage: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private reportSubject = new BehaviorSubject<PerformanceReport | null>(null);
  private isMonitoring = false;

  private readonly METRICS = {
    FRAME_TIME: 'frame_time',
    MEMORY_USAGE: 'memory_usage',
    BATTERY_IMPACT: 'battery_impact',
    CPU_USAGE: 'cpu_usage',
    JS_HEAP_SIZE: 'js_heap_size'
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupPerformanceObserver();
    this.startContinuousMonitoring();

    console.log('Performance monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  private setupPerformanceObserver(): void {
    // Observe React Native performance entries
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.handlePerformanceEntry(entry);
      });
    });

    observer.observe({ entryTypes: ['measure', 'resource'] });
  }

  private handlePerformanceEntry(entry: any): void {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration,
      unit: 'ms',
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.trimMetrics();

    // Emit report every 10 metrics
    if (this.metrics.length % 10 === 0) {
      this.emitReport();
    }
  }

  private startContinuousMonitoring(): void {
    // Monitor frame time (simplified)
    setInterval(() => {
      const start = performance.now();
      requestAnimationFrame(() => {
        const frameTime = performance.now() - start;
        this.recordMetric(this.METRICS.FRAME_TIME, frameTime, 'ms');
      });
    }, 1000);

    // Monitor memory usage (simplified)
    setInterval(() => {
      // This is a placeholder - in a real app, you would use React Native's Memory module
      const memoryUsage = Math.random() * 100; // Simulated
      this.recordMetric(this.METRICS.MEMORY_USAGE, memoryUsage, 'MB');
    }, 5000);

    // Monitor battery impact (simplified)
    setInterval(() => {
      // Placeholder for battery impact monitoring
      const batteryImpact = Math.random() * 10;
      this.recordMetric(this.METRICS.BATTERY_IMPACT, batteryImpact, '%/hour');
    }, 30000);
  }

  private recordMetric(name: string, value: number, unit: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.trimMetrics();
  }

  private trimMetrics(): void {
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private emitReport(): void {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics: this.metrics.slice(-100), // Last 100 metrics
      summary: this.calculateSummary()
    };

    this.reportSubject.next(report);
  }

  private calculateSummary(): any {
    const frameTimes = this.metrics
      .filter(m => m.name === this.METRICS.FRAME_TIME)
      .map(m => m.value);

    const averageFrameTime = frameTimes.length > 0 
      ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length 
      : 0;

    const memoryUsage = this.metrics
      .filter(m => m.name === this.METRICS.MEMORY_USAGE)
      .map(m => m.value);

    const averageMemoryUsage = memoryUsage.length > 0
      ? memoryUsage[memoryUsage.length - 1] // Latest
      : 0;

    const batteryImpact = this.metrics
      .filter(m => m.name === this.METRICS.BATTERY_IMPACT)
      .map(m => m.value);

    const averageBatteryImpact = batteryImpact.length > 0
      ? batteryImpact[batteryImpact.length - 1] // Latest
      : 0;

    return {
      averageFrameTime,
      memoryUsage: averageMemoryUsage,

  // Method to check if performance is within acceptable limits
  isPerformanceAcceptable(): { acceptable: boolean; issues: string[] } {
    const summary = this.calculateSummary();
    const issues: string[] = [];

    if (summary.averageFrameTime > 16.67) { // 60 FPS threshold
      issues.push('Frame time too high, UI may be janky');
    }

    if (summary.memoryUsage > 500) { // 500 MB threshold
      issues.push('High memory usage, app may crash');
    }

    if (summary.batteryImpact > 5) { // 5% per hour threshold
      issues.push('High battery impact');
    }

    return {
      acceptable: issues.length === 0,
      issues
    };
  }
}
