/**
 * 🔄 Enhanced Gateway Monitoring Engine
 * Core continuous monitoring system with historical data and alerts
 */

import { DataStorage } from './data-storage.js';
import { AlertSystem } from './alert-system.js';

export class EnhancedGatewayMonitor {
  constructor(config) {
    this.config = config;
    this.storage = new DataStorage();
    this.alertSystem = new AlertSystem(config.alerts, this.storage);
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
  }

  /**
   * 🚀 Start continuous monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring is already running');
      return;
    }

    try {
      console.log('🚀 Starting enhanced Gateway monitoring...');
      
      // Initialize storage
      await this.storage.initialize();
      
      // Test initial connection
      console.log('🔍 Testing initial Gateway connection...');
      const initialHealth = await this.checkGatewayHealth();
      
      if (initialHealth.status === 'unhealthy') {
        console.log('⚠️ Gateway is currently unhealthy, but monitoring will continue');
      } else {
        console.log('✅ Gateway is healthy, starting continuous monitoring');
      }

      // Start monitoring loop
      this.isMonitoring = true;
      this.startTime = new Date();
      
      this.monitoringInterval = setInterval(async () => {
        await this.performHealthCheck();
      }, this.config.checkInterval);

      console.log(`🔄 Continuous monitoring started (interval: ${this.config.checkInterval}ms)`);
      console.log(`📊 Session ID: ${this.sessionId}`);
      console.log(`🖥️ Dashboard: http://${this.config.dashboard.host}:${this.config.dashboard.port}`);
      
      // Start dashboard if enabled
      if (this.config.dashboard.enabled) {
        await this.startDashboard();
      }

    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * 🛑 Stop continuous monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('⚠️ Monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    const endTime = new Date();
    const duration = endTime - this.startTime;

    console.log('🛑 Continuous monitoring stopped');
    console.log(`📊 Session duration: ${Math.floor(duration / 1000)} seconds`);
    
    // Generate final report
    await this.generateFinalReport();
  }

  /**
   * 🔍 Perform a single health check
   */
  async performHealthCheck() {
    try {
      const health = await this.checkGatewayHealth();
      
      // Save to history
      await this.storage.saveHealthRecord({
        timestamp: new Date(),
        status: health.status,
        responseTime: health.responseTime,
        error: health.error,
        uptime: health.uptime,
        memoryUsage: health.memoryUsage
      });

      // Process alerts
      await this.alertSystem.processHealthCheck(health);

      // Update metrics
      const metrics = await this.storage.calculateMetrics(this.config.gatewayURL);
      
      // Log status (only on status changes or every 10 minutes)
      if (this.shouldLogStatus(health)) {
        console.log(`📊 Gateway Status: ${health.status.toUpperCase()} (${health.responseTime}ms)`);
        console.log(`📈 Uptime: ${metrics.uptime}s, Success Rate: ${metrics.successfulChecks}/${metrics.totalChecks}`);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  /**
   * 🏥 Check Gateway health (using dashboard method from Step 1.2)
   */
  async checkGatewayHealth() {
    const startTime = Date.now();
    
    try {
      // Use the dashboard endpoint that we know works
      const response = await fetch(this.config.gatewayURL, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/html',
          'User-Agent': 'originCheck/1.3.0'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status >= 200 && response.status < 300) {
        return {
          status: 'healthy',
          url: this.config.gatewayURL,
          responseTime,
          lastChecked: new Date(),
          note: 'Connected via dashboard endpoint'
        };
      } else {
        return {
          status: 'unhealthy',
          url: this.config.gatewayURL,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          lastChecked: new Date()
        };
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        url: this.config.gatewayURL,
        responseTime: Date.now() - startTime,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  /**
   * 📊 Get current monitoring status
   */
  async getMonitoringStatus() {
    try {
      const metrics = await this.storage.calculateMetrics(this.config.gatewayURL);
      const recentHistory = await this.storage.getRecentHistory(10);
      const recentAlerts = await this.storage.getRecentAlerts(5);
      const alertStats = await this.alertSystem.getAlertStats();

      return {
        session: {
          id: this.sessionId,
          startTime: this.startTime,
          isMonitoring: this.isMonitoring,
          gatewayURL: this.config.gatewayURL,
          checkInterval: this.config.checkInterval
        },
        currentStatus: recentHistory.length > 0 ? recentHistory[recentHistory.length - 1].status : 'unknown',
        metrics,
        recentHistory,
        recentAlerts,
        alertStats
      };
    } catch (error) {
      console.error('❌ Failed to get monitoring status:', error);
      return null;
    }
  }

  /**
   * 🖥️ Start simple web dashboard
   */
  async startDashboard() {
    try {
      // Simple HTTP server for dashboard
      const http = await import('http');
      
      const server = http.createServer(async (req, res) => {
        if (req.url === '/') {
          const status = await this.getMonitoringStatus();
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.generateDashboardHTML(status));
        } else if (req.url === '/api/status') {
          const status = await this.getMonitoringStatus();
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(status, null, 2));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      server.listen(this.config.dashboard.port, '0.0.0.0', () => {
        console.log(`🖥️ Dashboard started: http://0.0.0.0:${this.config.dashboard.port}`);
      });

    } catch (error) {
      console.error('❌ Failed to start dashboard:', error);
    }
  }

  /**
   * 🖥️ Generate dashboard HTML
   */
  generateDashboardHTML(status) {
    const statusColor = status?.currentStatus === 'healthy' ? '#4CAF50' : '#F44336';
    const uptime = status?.metrics?.uptime || 0;
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>originCheck - Gateway Monitor</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .status { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .status-indicator { display: inline-block; width: 20px; height: 20px; border-radius: 50%; margin-right: 10px; }
        .healthy { background-color: ${statusColor}; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦞 originCheck Gateway Monitor</h1>
            <p>Session: ${status?.session?.id || 'N/A' | 0}</p>
            <button class="refresh-btn" onclick="location.reload()">Refresh</button>
        </div>
        
        <div class="status">
            <h2><span class="status-indicator ${status?.currentStatus || 'unknown'}"></span>
            Gateway Status: ${(status?.currentStatus || 'unknown').toUpperCase()}</h2>
            <p>Gateway URL: ${status?.session?.gatewayURL || 'N/A'}</p>
            <p>Last Check: ${status?.metrics?.lastCheck ? new Date(status.metrics.lastCheck).toLocaleString() : 'N/A'}</p>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${uptimeHours}h ${uptimeMinutes}m</div>
                <div class="metric-label">Uptime</div>
            </div>
            <div class="metric">
                <div class="metric-value">${status?.metrics?.averageResponseTime || 0}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric">
                <div class="metric-value">${status?.metrics?.successfulChecks || 0}/${status?.metrics?.totalChecks || 0}</div>
                <div class="metric-label">Successful Checks</div>
            </div>
            <div class="metric">
                <div class="metric-value">${status?.alertStats?.unresolved || 0}</div>
                <div class="metric-label">Unresolved Alerts</div>
            </div>
        </div>
        
        ${status?.recentAlerts?.length > 0 ? `
        <div>
            <h3>Recent Alerts</h3>
            ${status.recentAlerts.map(alert => `
                <div class="alert">
                    <strong>${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}</strong><br>
                    ${alert.message}<br>
                    <small>${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
  }

  /**
   * 📊 Generate final monitoring report
   */
  async generateFinalReport() {
    try {
      const metrics = await this.storage.calculateMetrics(this.config.gatewayURL);
      const alertStats = await this.alertSystem.getAlertStats();
      
      console.log('\n📊 Final Monitoring Report');
      console.log('============================');
      console.log(`Session ID: ${this.sessionId}`);
      console.log(`Duration: ${Math.floor((Date.now() - this.startTime.getTime()) / 1000)} seconds`);
      console.log(`Total Checks: ${metrics.totalChecks}`);
      console.log(`Successful: ${metrics.successfulChecks}`);
      console.log(`Failed: ${metrics.failedChecks}`);
      console.log(`Success Rate: ${metrics.totalChecks > 0 ? Math.round((metrics.successfulChecks / metrics.totalChecks) * 100) : 0}%`);
      console.log(`Average Response Time: ${metrics.averageResponseTime}ms`);
      console.log(`Uptime: ${Math.floor(metrics.uptime / 60)} minutes`);
      console.log(`Total Alerts: ${alertStats.total}`);
      console.log(`Unresolved Alerts: ${alertStats.unresolved}`);
      
    } catch (error) {
      console.error('❌ Failed to generate final report:', error);
    }
  }

  /**
   * 🎯 Determine if status should be logged
   */
  shouldLogStatus(health) {
    // Log if status changed
    if (this.lastLoggedStatus !== health.status) {
      this.lastLoggedStatus = health.status;
      return true;
    }
    
    // Log every 10 minutes (600,000ms)
    if (!this.lastLogTime || (Date.now() - this.lastLogTime) > 600000) {
      this.lastLogTime = Date.now();
      return true;
    }
    
    return false;
  }

  /**
   * 🆔 Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🧪 Test enhanced monitoring
   */
  async testEnhancedMonitoring() {
    console.log('🧪 Testing enhanced monitoring system...');
    
    try {
      // Test storage
      await this.storage.initialize();
      console.log('✅ Storage system working');
      
      // Test alert system
      await this.alertSystem.testAlertSystem();
      console.log('✅ Alert system working');
      
      // Test health check
      const health = await this.checkGatewayHealth();
      console.log(`✅ Health check working: ${health.status} (${health.responseTime}ms)`);
      
      // Test metrics calculation
      await this.storage.saveHealthRecord({
        timestamp: new Date(),
        status: health.status,
        responseTime: health.responseTime,
        error: health.error
      });
      
      const metrics = await this.storage.calculateMetrics(this.config.gatewayURL);
      console.log(`✅ Metrics calculation working: ${metrics.totalChecks} checks`);
      
      console.log('🎉 Enhanced monitoring system test completed successfully!');
      
    } catch (error) {
      console.error('❌ Enhanced monitoring test failed:', error);
    }
  }
}
