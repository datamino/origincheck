/**
 * 📊 Enhanced Gateway Monitoring Types
 * Types for continuous monitoring, historical data, and alerts
 */

export interface HealthHistory {
  timestamp: Date;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  error?: string;
  uptime?: number;
  memoryUsage?: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptime: number;
  downtime: number;
  lastCheck: Date;
  lastHealthy: Date;
  lastUnhealthy: Date;
}

export interface AlertConfig {
  enabled: boolean;
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  thresholds: {
    responseTime: number; // Alert if response time > this (ms)
    consecutiveFailures: number; // Alert after this many failures
    downtimeMinutes: number; // Alert if down for this many minutes
  };
}

export interface Alert {
  id: string;
  type: 'gateway_down' | 'gateway_up' | 'slow_response' | 'consecutive_failures';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  details: {
    gatewayURL: string;
    responseTime?: number;
    error?: string;
    consecutiveFailures?: number;
    downtime?: number;
  };
}

export interface MonitoringSession {
  id: string;
  gatewayURL: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'stopped' | 'error';
  totalChecks: number;
  currentMetrics: PerformanceMetrics;
  alerts: Alert[];
  config: AlertConfig;
}

export interface DashboardData {
  session: MonitoringSession;
  recentHistory: HealthHistory[];
  currentStatus: 'healthy' | 'unhealthy' | 'unknown';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
  alerts: Alert[];
}

export interface EnhancedMonitoringConfig {
  gatewayURL: string;
  checkInterval: number; // milliseconds
  maxHistorySize: number; // maximum history records to keep
  alerts: AlertConfig;
  dashboard: {
    enabled: boolean;
    port: number;
    host: string;
  };
}
