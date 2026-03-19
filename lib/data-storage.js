/**
 * 📊 Historical Data Storage
 * Stores and manages Gateway health history and metrics
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class DataStorage {
  constructor(storageDir = './data') {
    this.storageDir = storageDir;
    this.historyFile = path.join(storageDir, 'health-history.json');
    this.metricsFile = path.join(storageDir, 'metrics.json');
    this.alertsFile = path.join(storageDir, 'alerts.json');
  }

  /**
   * 📁 Initialize storage directory and files
   */
  async initialize() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Initialize files if they don't exist
      await this.ensureFile(this.historyFile, []);
      await this.ensureFile(this.metricsFile, {});
      await this.ensureFile(this.alertsFile, []);
      
      console.log(`📁 Data storage initialized: ${this.storageDir}`);
    } catch (error) {
      console.error('❌ Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * 📝 Save health history record
   */
  async saveHealthRecord(record) {
    try {
      const history = await this.loadHealthHistory();
      history.push(record);
      
      // Keep only last 1000 records to prevent file from growing too large
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }
      
      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
      console.log(`📝 Health record saved: ${record.status} (${record.responseTime}ms)`);
    } catch (error) {
      console.error('❌ Failed to save health record:', error);
    }
  }

  /**
   * 📚 Load health history
   */
  async loadHealthHistory() {
    try {
      const content = await fs.readFile(this.historyFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.log('📝 No health history found, starting fresh');
      return [];
    }
  }

  /**
   * 📊 Get recent health history (last N records)
   */
  async getRecentHistory(count = 100) {
    try {
      const history = await this.loadHealthHistory();
      return history.slice(-count);
    } catch (error) {
      console.error('❌ Failed to load recent history:', error);
      return [];
    }
  }

  /**
   * 📈 Calculate performance metrics
   */
  async calculateMetrics(gatewayURL) {
    try {
      const history = await this.loadHealthHistory();
      
      if (history.length === 0) {
        return this.getEmptyMetrics();
      }

      const responseTimes = history.map(h => h.responseTime).filter(rt => rt > 0);
      const healthyChecks = history.filter(h => h.status === 'healthy');
      const failedChecks = history.filter(h => h.status === 'unhealthy');

      // Calculate uptime/downtime
      let uptime = 0;
      let downtime = 0;
      
      if (history.length > 1) {
        for (let i = 1; i < history.length; i++) {
          const duration = history[i].timestamp - history[i-1].timestamp;
          if (history[i-1].status === 'healthy') {
            uptime += duration;
          } else {
            downtime += duration;
          }
        }
      }

      const metrics = {
        averageResponseTime: responseTimes.length > 0 ? 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        totalChecks: history.length,
        successfulChecks: healthyChecks.length,
        failedChecks: failedChecks.length,
        uptime: Math.floor(uptime / 1000), // Convert to seconds
        downtime: Math.floor(downtime / 1000),
        lastCheck: history[history.length - 1]?.timestamp || new Date(),
        lastHealthy: healthyChecks.length > 0 ? 
          healthyChecks[healthyChecks.length - 1].timestamp : null,
        lastUnhealthy: failedChecks.length > 0 ? 
          failedChecks[failedChecks.length - 1].timestamp : null
      };

      await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
      console.log(`📊 Metrics calculated: ${metrics.successfulChecks}/${metrics.totalChecks} healthy`);
      
      return metrics;
    } catch (error) {
      console.error('❌ Failed to calculate metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * 🔔 Save alert
   */
  async saveAlert(alert) {
    try {
      const alerts = await this.loadAlerts();
      alerts.push(alert);
      
      // Keep only last 500 alerts
      if (alerts.length > 500) {
        alerts.splice(0, alerts.length - 500);
      }
      
      await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
      console.log(`🔔 Alert saved: ${alert.type} (${alert.severity})`);
    } catch (error) {
      console.error('❌ Failed to save alert:', error);
    }
  }

  /**
   * 🔔 Load alerts
   */
  async loadAlerts() {
    try {
      const content = await fs.readFile(this.alertsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.log('🔔 No alerts found, starting fresh');
      return [];
    }
  }

  /**
   * 🔔 Get recent alerts
   */
  async getRecentAlerts(count = 50) {
    try {
      const alerts = await this.loadAlerts();
      return alerts.slice(-count);
    } catch (error) {
      console.error('❌ Failed to load recent alerts:', error);
      return [];
    }
  }

  /**
   * 🔔 Resolve alert
   */
  async resolveAlert(alertId) {
    try {
      const alerts = await this.loadAlerts();
      const alert = alerts.find(a => a.id === alertId);
      
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
        console.log(`✅ Alert resolved: ${alertId}`);
      }
    } catch (error) {
      console.error('❌ Failed to resolve alert:', error);
    }
  }

  /**
   * 📝 Ensure file exists
   */
  async ensureFile(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }

  /**
   * 📊 Get empty metrics
   */
  getEmptyMetrics() {
    return {
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      uptime: 0,
      downtime: 0,
      lastCheck: new Date(),
      lastHealthy: null,
      lastUnhealthy: null
    };
  }

  /**
   * 🧹 Clean old data
   */
  async cleanup() {
    try {
      // Keep only last 7 days of data
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const history = await this.loadHealthHistory();
      const filteredHistory = history.filter(record => 
        new Date(record.timestamp) > cutoffDate
      );
      
      if (filteredHistory.length !== history.length) {
        await fs.writeFile(this.historyFile, JSON.stringify(filteredHistory, null, 2));
        console.log(`🧹 Cleaned ${history.length - filteredHistory.length} old records`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup data:', error);
    }
  }
}
