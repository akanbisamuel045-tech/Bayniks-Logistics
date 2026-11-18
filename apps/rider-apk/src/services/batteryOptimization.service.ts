/**
 * Battery Optimization & Auto-Throttling Service for Dispatch Riders
 * Monitors hardware battery levels to prevent phone shutdown during high-temperature Lagos runs.
 * Auto-throttles GPS location ping frequency from 5s to 15s when battery <= 15%.
 */

export interface BatteryStatus {
  levelPercent: number;
  isCharging: boolean;
  isLowBatteryThrottled: boolean;
}

export type BatteryStatusListener = (status: BatteryStatus) => void;

class BatteryOptimizationService {
  private currentStatus: BatteryStatus = {
    levelPercent: 90,
    isCharging: false,
    isLowBatteryThrottled: false,
  };

  private listeners: Set<BatteryStatusListener> = new Set();
  private batteryManager: any = null;

  public async initBatteryMonitoring(): Promise<BatteryStatus> {
    if (typeof window === 'undefined') {
      return this.currentStatus;
    }

    try {
      if ('getBattery' in navigator) {
        this.batteryManager = await (navigator as any).getBattery();
        this.updateFromManager();

        this.batteryManager.addEventListener('levelchange', () => this.updateFromManager());
        this.batteryManager.addEventListener('chargingchange', () => this.updateFromManager());
      }
    } catch {
      // getBattery not supported or restricted by permissions policy
    }

    return this.currentStatus;
  }

  private updateFromManager(): void {
    if (!this.batteryManager) return;

    const levelPercent = Math.round((this.batteryManager.level ?? 0.9) * 100);
    const isCharging = Boolean(this.batteryManager.charging);
    const isLowBatteryThrottled = levelPercent <= 15 && !isCharging;

    this.currentStatus = {
      levelPercent,
      isCharging,
      isLowBatteryThrottled,
    };

    this.notifyListeners();
  }

  public subscribe(listener: BatteryStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addListener(listener: BatteryStatusListener): () => void {
    return this.subscribe(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus);
      } catch {
        // Safe dispatch
      }
    }
  }

  public getStatus(): BatteryStatus {
    return this.currentStatus;
  }

  /**
   * Manual override for testing and simulation.
   */
  public simulateBatteryStatus(levelPercent: number, isCharging = false): BatteryStatus {
    const isLowBatteryThrottled = levelPercent <= 15 && !isCharging;
    this.currentStatus = {
      levelPercent,
      isCharging,
      isLowBatteryThrottled,
    };
    this.notifyListeners();
    return this.currentStatus;
  }
}

export const batteryOptimizationService = new BatteryOptimizationService();
