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
    const statusColor = status?.currentStatus === 'healthy' ? '#10b981' : '#ef4444';
    const uptime = status?.metrics?.uptime || 0;
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>originCheck Mission Control</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary-green: #10b981;
            --primary-red: #ef4444;
            --primary-amber: #f59e0b;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border-color: #e2e8f0;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg-primary);
            background-image: radial-gradient(circle, #e2e8f0 1px, transparent 1px);
            background-size: 20px 20px;
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Top Status Bar */
        .status-bar {
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-sm);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .status-bar-left {
            display: flex;
            align-items: center;
            gap: 24px;
        }

        .system-title {
            font-family: 'Rajdhani', sans-serif;
            font-weight: 700;
            font-size: 20px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--text-primary);
        }

        .system-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .status-indicator.healthy {
            background: var(--primary-green);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }

        .status-indicator.unhealthy {
            background: var(--primary-red);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 currentColor;
            }
            70% {
                box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
            }
        }

        /* Main Layout */
        .main-container {
            display: flex;
            height: calc(100vh - 60px);
        }

        /* Sidebar */
        .sidebar {
            width: 80px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            padding: 24px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }

        .nav-item {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 18px;
        }

        .nav-item:hover {
            background: var(--primary-green);
            color: white;
            transform: scale(1.05);
            box-shadow: var(--shadow-md);
        }

        /* Content Area */
        .content {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
        }

        /* Topology Canvas */
        .topology-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-md);
            position: relative;
            height: 400px;
            overflow: hidden;
        }

        .topology-header {
            font-family: 'Rajdhani', sans-serif;
            font-weight: 700;
            font-size: 16px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 20px;
            color: var(--text-primary);
        }

        .topology-canvas {
            position: relative;
            width: 100%;
            height: 320px;
            background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%);
        }

        /* Node Cards */
        .node-card {
            position: absolute;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 16px;
            min-width: 180px;
            box-shadow: var(--shadow-md);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .node-card.healthy {
            border-color: var(--primary-green);
            animation: nodePulse 3s infinite;
        }

        .node-card.healthy::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, var(--primary-green), transparent);
            border-radius: 12px;
            z-index: -1;
            opacity: 0.3;
            animation: pingRing 2s infinite;
        }

        .node-card.unhealthy {
            border-color: var(--primary-red);
            animation: nodeFlicker 1s infinite;
        }

        .node-card.degraded {
            border-color: var(--primary-amber);
            animation: nodeBreathe 2s infinite;
        }

        @keyframes nodePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        @keyframes pingRing {
            0% {
                transform: scale(1);
                opacity: 0.3;
            }
            100% {
                transform: scale(1.5);
                opacity: 0;
            }
        }

        @keyframes nodeFlicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        @keyframes nodeBreathe {
            0%, 100% { box-shadow: var(--shadow-md); }
            50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
        }

        .node-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .node-title {
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .node-status {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .node-status.healthy { background: var(--primary-green); }
        .node-status.unhealthy { background: var(--primary-red); }
        .node-status.degraded { background: var(--primary-amber); }

        .node-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
        }

        .node-metric {
            text-align: center;
        }

        .metric-value {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 16px;
            color: var(--text-primary);
        }

        .metric-label {
            font-size: 10px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .node-corner {
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 20px 20px 0;
            border-color: transparent #10b981 transparent transparent;
        }

        .node-corner.unhealthy { border-color: transparent #ef4444 transparent transparent; }
        .node-corner.degraded { border-color: transparent #f59e0b transparent transparent; }

        /* Connection Lines */
        .connection-line {
            position: absolute;
            height: 2px;
            background: linear-gradient(90deg, var(--primary-green), transparent);
            transform-origin: left center;
            animation: flowAnimation 3s infinite;
            z-index: -1;
        }

        @keyframes flowAnimation {
            0% { background-position: -100% 0; }
            100% { background-position: 100% 0; }
        }

        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }

        .metric-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            box-shadow: var(--shadow-md);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .metric-card-header {
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 12px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--text-secondary);
            margin-bottom: 12px;
        }

        .metric-card-value {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 24px;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .metric-card-subtitle {
            font-size: 12px;
            color: var(--text-secondary);
        }

        /* Legend */
        .legend {
            position: fixed;
            bottom: 24px;
            left: 24px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 16px;
            box-shadow: var(--shadow-md);
        }

        .legend-title {
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 12px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 12px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 12px;
        }

        .legend-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                width: 60px;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .node-card {
                min-width: 140px;
                padding: 12px;
            }
        }
    </style>
</head>
<body>
    <!-- Status Bar -->
    <div class="status-bar">
        <div class="status-bar-left">
            <div class="system-title">originCheck Mission Control</div>
            <div class="system-status">
                <div class="status-indicator ${status?.currentStatus || 'unknown'}"></div>
                <span>${status?.currentStatus?.toUpperCase() || 'UNKNOWN'}</span>
            </div>
            <div class="system-status">
                <span>Session: ${status?.session?.id?.split('_')[1] || 'N/A'}</span>
            </div>
        </div>
        <div class="system-status">
            <span>Last Update: ${new Date().toLocaleTimeString()}</span>
        </div>
    </div>

    <div class="main-container">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="nav-item">🦞</div>
            <div class="nav-item">📊</div>
            <div class="nav-item">🔔</div>
            <div class="nav-item">⚙️</div>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Topology Canvas -->
            <div class="topology-container">
                <div class="topology-header">System Topology</div>
                <div class="topology-canvas" id="topology-canvas">
                    <!-- Gateway Node -->
                    <div class="node-card ${status?.currentStatus || 'unknown'}" style="top: 120px; left: 50%; transform: translateX(-50%);">
                        <div class="node-corner ${status?.currentStatus || 'unknown'}"></div>
                        <div class="node-header">
                            <div class="node-title">Gateway</div>
                            <div class="node-status ${status?.currentStatus || 'unknown'}"></div>
                        </div>
                        <div class="node-metrics">
                            <div class="node-metric">
                                <div class="metric-value">${status?.metrics?.averageResponseTime || 0}ms</div>
                                <div class="metric-label">Response</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">${status?.metrics?.successfulChecks || 0}/${status?.metrics?.totalChecks || 0}</div>
                                <div class="metric-label">Success</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">${uptimeHours}h ${uptimeMinutes}m</div>
                                <div class="metric-label">Uptime</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">${status?.alertStats?.unresolved || 0}</div>
                                <div class="metric-label">Alerts</div>
                            </div>
                        </div>
                    </div>

                    <!-- Connection Lines -->
                    <div class="connection-line" style="top: 140px; left: 25%; width: 25%;"></div>
                    <div class="connection-line" style="top: 140px; left: 75%; width: 25%; transform: rotate(180deg);"></div>

                    <!-- Telegram Node -->
                    <div class="node-card healthy" style="top: 40px; left: 25%;">
                        <div class="node-corner healthy"></div>
                        <div class="node-header">
                            <div class="node-title">Telegram</div>
                            <div class="node-status healthy"></div>
                        </div>
                        <div class="node-metrics">
                            <div class="node-metric">
                                <div class="metric-value">ON</div>
                                <div class="metric-label">Status</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">1/1</div>
                                <div class="metric-label">Accounts</div>
                            </div>
                        </div>
                    </div>

                    <!-- CLI Node -->
                    <div class="node-card healthy" style="top: 40px; left: 75%;">
                        <div class="node-corner healthy"></div>
                        <div class="node-header">
                            <div class="node-title">CLI</div>
                            <div class="node-status healthy"></div>
                        </div>
                        <div class="node-metrics">
                            <div class="node-metric">
                                <div class="metric-value">3</div>
                                <div class="metric-label">Sessions</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">12d</div>
                                <div class="metric-label">Active</div>
                            </div>
                        </div>
                    </div>

                    <!-- AI Node -->
                    <div class="node-card healthy" style="top: 200px; left: 25%;">
                        <div class="node-corner healthy"></div>
                        <div class="node-header">
                            <div class="node-title">AI Engine</div>
                            <div class="node-status healthy"></div>
                        </div>
                        <div class="node-metrics">
                            <div class="node-metric">
                                <div class="metric-value">GPT-4</div>
                                <div class="metric-label">Model</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">200k</div>
                                <div class="metric-label">Context</div>
                            </div>
                        </div>
                    </div>

                    <!-- Memory Node -->
                    <div class="node-card healthy" style="top: 200px; left: 75%;">
                        <div class="node-corner healthy"></div>
                        <div class="node-header">
                            <div class="node-title">Memory</div>
                            <div class="node-status healthy"></div>
                        </div>
                        <div class="node-metrics">
                            <div class="node-metric">
                                <div class="metric-value">0</div>
                                <div class="metric-label">Files</div>
                            </div>
                            <div class="node-metric">
                                <div class="metric-value">ON</div>
                                <div class="metric-label">Cache</div>
                            </div>
                        </div>
                    </div>

                    <!-- More Connection Lines -->
                    <div class="connection-line" style="top: 60px; left: 35%; width: 15%; transform: rotate(45deg);"></div>
                    <div class="connection-line" style="top: 60px; left: 65%; width: 15%; transform: rotate(-45deg);"></div>
                    <div class="connection-line" style="top: 140px; left: 35%; width: 15%; transform: rotate(-45deg);"></div>
                    <div class="connection-line" style="top: 140px; left: 65%; width: 15%; transform: rotate(45deg);"></div>
                </div>
            </div>

            <!-- Metrics Grid -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-card-header">System Uptime</div>
                    <div class="metric-card-value">${uptimeHours}h ${uptimeMinutes}m</div>
                    <div class="metric-card-subtitle">Total operational time</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-card-header">Response Time</div>
                    <div class="metric-card-value">${status?.metrics?.averageResponseTime || 0}ms</div>
                    <div class="metric-card-subtitle">Average gateway response</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-card-header">Success Rate</div>
                    <div class="metric-card-value">${status?.metrics?.totalChecks > 0 ? Math.round((status?.metrics?.successfulChecks / status?.metrics?.totalChecks) * 100) : 0}%</div>
                    <div class="metric-card-subtitle">${status?.metrics?.successfulChecks || 0}/${status?.metrics?.totalChecks || 0} checks</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-card-header">Active Alerts</div>
                    <div class="metric-card-value">${status?.alertStats?.unresolved || 0}</div>
                    <div class="metric-card-subtitle">${status?.alertStats?.total || 0} total alerts</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Legend -->
    <div class="legend">
        <div class="legend-title">Node Status</div>
        <div class="legend-item">
            <div class="legend-indicator" style="background: var(--primary-green);"></div>
            <span>Healthy</span>
        </div>
        <div class="legend-item">
            <div class="legend-indicator" style="background: var(--primary-amber);"></div>
            <span>Degraded</span>
        </div>
        <div class="legend-item">
            <div class="legend-indicator" style="background: var(--primary-red);"></div>
            <span>Critical</span>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
        
        // Add interactive node click handlers
        document.querySelectorAll('.node-card').forEach(node => {
            node.addEventListener('click', function() {
                // Future: Expand node details
                console.log('Node clicked:', this.querySelector('.node-title').textContent);
            });
        });
    </script>
</body>
</html>
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
