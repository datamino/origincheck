/**
 * 🔔 Alert and Notification System
 * Handles alerts, notifications, and alert management
 */

export class AlertSystem {
  constructor(config, dataStorage) {
    this.config = config;
    this.dataStorage = dataStorage;
    this.consecutiveFailures = 0;
    this.lastStatus = 'unknown';
    this.alertCooldowns = new Map(); // Prevent alert spam
  }

  /**
   * 🔍 Process health check result and trigger alerts if needed
   */
  async processHealthCheck(healthResult) {
    const { status, responseTime, error, url } = healthResult;
    
    // Check for status changes
    if (this.lastStatus !== 'unknown' && this.lastStatus !== status) {
      if (status === 'unhealthy' && this.lastStatus === 'healthy') {
        await this.triggerAlert('gateway_down', 'high', 
          `Gateway is down: ${error || 'Unknown error'}`, healthResult);
      } else if (status === 'healthy' && this.lastStatus === 'unhealthy') {
        await this.triggerAlert('gateway_up', 'medium', 
          'Gateway is back online', healthResult);
      }
    }

    // Check for consecutive failures
    if (status === 'unhealthy') {
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.config.thresholds.consecutiveFailures) {
        await this.triggerAlert('consecutive_failures', 'critical', 
          `Gateway failed ${this.consecutiveFailures} consecutive checks`, healthResult);
      }
    } else {
      this.consecutiveFailures = 0;
    }

    // Check for slow response times
    if (status === 'healthy' && responseTime > this.config.thresholds.responseTime) {
      await this.triggerAlert('slow_response', 'medium', 
        `Gateway response time is ${responseTime}ms (threshold: ${this.config.thresholds.responseTime}ms)`, 
        healthResult);
    }

    this.lastStatus = status;
  }

  /**
   * 🔔 Trigger an alert
   */
  async triggerAlert(type, severity, message, details) {
    // Check cooldown to prevent spam
    const cooldownKey = `${type}_${severity}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    
    if (lastAlert && (now - lastAlert) < 60000) { // 1 minute cooldown
      console.log(`⏰ Alert cooldown: ${type} (${severity})`);
      return;
    }

    this.alertCooldowns.set(cooldownKey, now);

    const alert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      details: {
        gatewayURL: details.url,
        responseTime: details.responseTime,
        error: details.error,
        consecutiveFailures: this.consecutiveFailures
      }
    };

    // Save alert
    await this.dataStorage.saveAlert(alert);

    // Send notifications
    await this.sendNotifications(alert);

    console.log(`🔔 Alert triggered: ${type} (${severity}) - ${message}`);
  }

  /**
   * 📧 Send notifications for alert
   */
  async sendNotifications(alert) {
    if (!this.config.enabled) {
      console.log('🔕 Alerts disabled');
      return;
    }

    // Email notifications
    if (this.config.email?.enabled) {
      await this.sendEmailNotification(alert);
    }

    // Webhook notifications
    if (this.config.webhook?.enabled) {
      await this.sendWebhookNotification(alert);
    }

    // Console notification (always)
    this.printConsoleNotification(alert);
  }

  /**
   * 📧 Send email notification
   */
  async sendEmailNotification(alert) {
    try {
      // For now, just log the email that would be sent
      // In a real implementation, you'd use nodemailer or similar
      const emailContent = this.formatEmailContent(alert);
      
      console.log(`📧 Email notification would be sent to:`);
      console.log(`   Recipients: ${this.config.email.recipients.join(', ')}`);
      console.log(`   Subject: ${emailContent.subject}`);
      console.log(`   Body: ${emailContent.body.substring(0, 100)}...`);
      
      // TODO: Implement actual email sending
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransporter({ ... });
      // await transporter.sendMail({ ... });
      
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
  }

  /**
   * 🔗 Send webhook notification
   */
  async sendWebhookNotification(alert) {
    try {
      const payload = {
        alert,
        timestamp: new Date(),
        service: 'originCheck',
        version: '1.3.0'
      };

      const response = await fetch(this.config.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.webhook.headers
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`🔗 Webhook notification sent: ${this.config.webhook.url}`);
      } else {
        console.log(`❌ Webhook notification failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send webhook notification:', error);
    }
  }

  /**
   * 🖥️ Print console notification
   */
  printConsoleNotification(alert) {
    const severityIcons = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    const icon = severityIcons[alert.severity] || '🔔';
    
    console.log(`\n${icon} ALERT: ${alert.type.toUpperCase()}`);
    console.log(`   Severity: ${alert.severity.toUpperCase()}`);
    console.log(`   Message: ${alert.message}`);
    console.log(`   Gateway: ${alert.details.gatewayURL}`);
    console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
    
    if (alert.details.responseTime) {
      console.log(`   Response Time: ${alert.details.responseTime}ms`);
    }
    
    if (alert.details.error) {
      console.log(`   Error: ${alert.details.error}`);
    }
    
    console.log(`   Consecutive Failures: ${alert.details.consecutiveFailures}`);
    console.log('');
  }

  /**
   * 📧 Format email content
   */
  formatEmailContent(alert) {
    const subject = `[originCheck Alert] ${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}`;
    
    const body = `
originCheck Alert Notification

Type: ${alert.type.toUpperCase()}
Severity: ${alert.severity.toUpperCase()}
Message: ${alert.message}
Gateway: ${alert.details.gatewayURL}
Time: ${alert.timestamp.toLocaleString()}

Details:
- Response Time: ${alert.details.responseTime || 'N/A'}ms
- Error: ${alert.details.error || 'N/A'}
- Consecutive Failures: ${alert.details.consecutiveFailures}

This is an automated alert from originCheck Gateway Monitoring System.
    `.trim();

    return { subject, body };
  }

  /**
   * 🆔 Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🔕 Test alert system
   */
  async testAlertSystem() {
    console.log('🧪 Testing alert system...');
    
    const testAlert = {
      id: this.generateAlertId(),
      type: 'test',
      severity: 'low',
      message: 'This is a test alert from originCheck',
      timestamp: new Date(),
      resolved: false,
      details: {
        gatewayURL: 'http://test-gateway:18789',
        responseTime: 50,
        error: null,
        consecutiveFailures: 0
      }
    };

    await this.sendNotifications(testAlert);
    console.log('✅ Alert system test completed');
  }

  /**
   * 📊 Get alert statistics
   */
  async getAlertStats() {
    try {
      const alerts = await this.dataStorage.loadAlerts();
      
      const stats = {
        total: alerts.length,
        unresolved: alerts.filter(a => !a.resolved).length,
        byType: {},
        bySeverity: {},
        recent24h: alerts.filter(a => 
          (Date.now() - new Date(a.timestamp).getTime()) < 24 * 60 * 60 * 1000
        ).length
      };

      alerts.forEach(alert => {
        stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get alert stats:', error);
      return { total: 0, unresolved: 0, byType: {}, bySeverity: {}, recent24h: 0 };
    }
  }

  /**
   * 🔧 Update alert configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Alert configuration updated');
  }
}
