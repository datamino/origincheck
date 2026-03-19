#!/usr/bin/env node

/**
 * 🚀 Start Enhanced Gateway Monitoring
 * Starts continuous monitoring with real-time dashboard and alerts
 */

import { EnhancedGatewayMonitor } from '../lib/enhanced-monitor.js';
import * as fs from 'fs/promises';

console.log('🚀 Starting Enhanced Gateway Monitoring');
console.log('=====================================\n');

// Load configuration
async function loadConfiguration() {
  try {
    // Try to read OpenClaw config for Gateway URL
    const configPath = '/root/.openclaw/openclaw.json';
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    console.log('📋 OpenClaw configuration loaded');
    console.log(`   Gateway URL: http://127.0.0.1:18789/`);
    console.log(`   Auth Mode: ${config.gateway?.auth?.mode || 'none'}`);
    
    return {
      gatewayURL: 'http://127.0.0.1:18789/',
      checkInterval: 30000, // 30 seconds
      maxHistorySize: 1000,
      alerts: {
        enabled: true,
        email: {
          enabled: false, // Set to true and configure for email alerts
          recipients: ['admin@example.com'],
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: '',
          smtpPass: ''
        },
        webhook: {
          enabled: false, // Set to true and configure for webhook alerts
          url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        thresholds: {
          responseTime: 100, // Alert if response time > 100ms
          consecutiveFailures: 3, // Alert after 3 consecutive failures
          downtimeMinutes: 5 // Alert if down for 5 minutes
        }
      },
      dashboard: {
        enabled: true,
        port: 3000,
        host: 'localhost'
      }
    };
    
  } catch (error) {
    console.log('⚠️ Could not read OpenClaw config, using defaults');
    
    return {
      gatewayURL: 'http://127.0.0.1:18789/',
      checkInterval: 30000,
      maxHistorySize: 1000,
      alerts: {
        enabled: true,
        email: { enabled: false, recipients: [] },
        webhook: { enabled: false, url: '' },
        thresholds: {
          responseTime: 100,
          consecutiveFailures: 3,
          downtimeMinutes: 5
        }
      },
      dashboard: {
        enabled: true,
        port: 3000,
        host: 'localhost'
      }
    };
  }
}

// Start monitoring
async function startEnhancedMonitoring() {
  try {
    // Load configuration
    const config = await loadConfiguration();
    
    console.log('⚙️ Enhanced Monitoring Configuration:');
    console.log(`   Gateway URL: ${config.gatewayURL}`);
    console.log(`   Check Interval: ${config.checkInterval / 1000} seconds`);
    console.log(`   Alerts Enabled: ${config.alerts.enabled}`);
    console.log(`   Response Time Threshold: ${config.alerts.thresholds.responseTime}ms`);
    console.log(`   Consecutive Failures Threshold: ${config.alerts.thresholds.consecutiveFailures}`);
    console.log(`   Dashboard: http://${config.dashboard.host}:${config.dashboard.port}`);
    console.log();

    // Create and start monitor
    const monitor = new EnhancedGatewayMonitor(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, stopping monitoring gracefully...');
      await monitor.stopMonitoring();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, stopping monitoring gracefully...');
      await monitor.stopMonitoring();
      process.exit(0);
    });

    // Start monitoring
    await monitor.startMonitoring();
    
    console.log('🎉 Enhanced Gateway Monitoring is now running!');
    console.log('📊 Monitoring features active:');
    console.log('   ✅ Continuous health checks (every 30 seconds)');
    console.log('   ✅ Historical data storage');
    console.log('   ✅ Performance metrics tracking');
    console.log('   ✅ Alert and notification system');
    console.log('   ✅ Real-time web dashboard');
    console.log();
    console.log('🖥️ Dashboard available at:');
    console.log(`   http://${config.dashboard.host}:${config.dashboard.port}`);
    console.log();
    console.log('🔔 Alerts configured for:');
    console.log(`   • Gateway down/up events`);
    console.log(`   • Slow response times (>${config.alerts.thresholds.responseTime}ms)`);
    console.log(`   • Consecutive failures (>${config.alerts.thresholds.consecutiveFailures})`);
    console.log(`   • Extended downtime (>${config.alerts.thresholds.downtimeMinutes} minutes)`);
    console.log();
    console.log('Press Ctrl+C to stop monitoring gracefully');
    
    // Keep the process running
    console.log('🔄 Monitoring is active... (Press Ctrl+C to stop)');
    
  } catch (error) {
    console.error('❌ Failed to start enhanced monitoring:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start enhanced monitoring
startEnhancedMonitoring().catch(console.error);
