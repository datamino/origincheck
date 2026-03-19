import { GatewayHealth, AuthInfo, ChannelHealth, MemoryInfo } from './types/config.js';

/**
 * 🏥 Gateway Health Monitor - CORE MONITORING ENGINE
 * 
 * This is the MOST IMPORTANT file in originCheck - it's the heart of our monitoring system.
 * It connects to OpenClaw Gateway and extracts real-time health data.
 * 
 * 🎯 Purpose: Monitor OpenClaw Gateway health, performance, and status
 * 🔥 Why Critical: Without this, we can't monitor anything - all monitoring starts here
 * 🚀 Impact: This file determines if OpenClaw is healthy, responsive, and working
 */

export class GatewayHealthMonitor {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly HEALTH_ENDPOINT = '/api/health';
  private static readonly STATUS_ENDPOINT = '/api/status';

  /**
   * 🏥 MAIN HEALTH CHECK METHOD
   * 
   * This is the core method that:
   * 1. Connects to OpenClaw Gateway
   * 2. Tests if Gateway is alive and responsive
   * 3. Extracts comprehensive health metrics
   * 4. Returns detailed health status
   * 
   * @param gatewayURL - The Gateway URL to monitor (e.g., "http://localhost:18789")
   * @param authInfo - Authentication credentials for Gateway
   * @returns Complete Gateway health status
   */
  static async checkGatewayHealth(gatewayURL: string, authInfo?: AuthInfo): Promise<GatewayHealth> {
    const startTime = Date.now();
    
    try {
      console.log(`🏥 Checking Gateway health at: ${gatewayURL}`);
      
      // Step 1: Test basic connectivity
      const isReachable = await this.testBasicConnectivity(gatewayURL, authInfo);
      if (!isReachable) {
        return this.createUnhealthyHealth(gatewayURL, 'Gateway not reachable', Date.now() - startTime);
      }

      // Step 2: Get detailed health metrics
      const healthData = await this.fetchHealthData(gatewayURL, authInfo);
      const responseTime = Date.now() - startTime;

      // Step 3: Parse and structure health data
      return this.parseHealthResponse(healthData, gatewayURL, responseTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Gateway health check failed: ${errorMessage}`);
      return this.createUnhealthyHealth(gatewayURL, errorMessage, Date.now() - startTime);
    }
  }

  /**
   * 🔌 BASIC CONNECTIVITY TEST
   * 
   * Tests if Gateway is responding at all.
   * This is the first check - if this fails, nothing else matters.
   * 
   * @param url - Gateway URL to test
   * @param auth - Authentication info
   * @returns True if Gateway responds, false otherwise
   */
  private static async testBasicConnectivity(url: string, auth?: AuthInfo): Promise<boolean> {
    try {
      const headers = this.buildAuthHeaders(auth);
      const response = await fetch(`${url}${this.HEALTH_ENDPOINT}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT)
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 📊 FETCH DETAILED HEALTH DATA
   * 
   * Gets comprehensive health metrics from Gateway.
   * This extracts the real monitoring data we need.
   * 
   * @param url - Gateway URL
   * @param auth - Authentication info
   * @returns Raw health data from Gateway API
   */
  private static async fetchHealthData(url: string, auth?: AuthInfo): Promise<any> {
    const headers = this.buildAuthHeaders(auth);
    
    // Try to get comprehensive health data
    try {
      const response = await fetch(`${url}${this.STATUS_ENDPOINT}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT)
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback to basic health endpoint
      const response = await fetch(`${url}${this.HEALTH_ENDPOINT}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT)
      });

      if (response.ok) {
        return await response.json();
      }
    }

    throw new Error('Failed to fetch health data from Gateway');
  }

  /**
   * 🔍 PARSE HEALTH RESPONSE
   * 
   * Converts raw Gateway data into structured health information.
   * This transforms API responses into our monitoring format.
   * 
   * @param data - Raw health data from Gateway
   * @param url - Gateway URL
   * @param responseTime - How long the request took
   * @returns Structured Gateway health information
   */
  private static parseHealthResponse(data: any, url: string, responseTime: number): GatewayHealth {
    const health: GatewayHealth = {
      status: 'healthy',
      url,
      responseTime,
      lastChecked: new Date()
    };

    // Extract basic Gateway info
    if (data.status) {
      health.status = data.status === 'ok' ? 'healthy' : 'unhealthy';
    }

    if (data.uptime) {
      health.uptime = data.uptime;
    }

    if (data.version) {
      health.version = data.version;
    }

    // Extract memory information
    if (data.memory || data.system) {
      health.memory = this.parseMemoryInfo(data.memory || data.system);
    }

    // Extract channel information
    if (data.channels || data.services) {
      health.channels = this.parseChannelHealth(data.channels || data.services);
    }

    return health;
  }

  /**
   * 💾 PARSE MEMORY INFORMATION
   * 
   * Extracts memory usage statistics from Gateway data.
   * This helps us monitor if Gateway is running out of memory.
   * 
   * @param memoryData - Raw memory data from Gateway
   * @returns Structured memory information
   */
  private static parseMemoryInfo(memoryData: any): MemoryInfo {
    try {
      const used = memoryData.used || memoryData.heapUsed || 0;
      const total = memoryData.total || memoryData.heapTotal || 0;
      
      return {
        used: Math.round(used / 1024 / 1024), // Convert to MB
        total: Math.round(total / 1024 / 1024), // Convert to MB
        percentage: total > 0 ? Math.round((used / total) * 100) : 0
      };
    } catch {
      return {
        used: 0,
        total: 0,
        percentage: 0
      };
    }
  }

  /**
   * 📡 PARSE CHANNEL HEALTH
   * 
   * Extracts channel status information from Gateway data.
   * This shows which communication channels are working.
   * 
   * @param channelData - Raw channel data from Gateway
   * @returns Array of channel health information
   */
  private static parseChannelHealth(channelData: any): ChannelHealth[] {
    const channels: ChannelHealth[] = [];

    try {
      if (Array.isArray(channelData)) {
        channelData.forEach((channel, index) => {
          channels.push({
            name: channel.name || channel.type || `channel-${index}`,
            type: channel.type || 'unknown',
            status: channel.status === 'active' || channel.enabled ? 'active' : 'inactive',
            messageCount: channel.messageCount || channel.messages || 0,
            lastMessage: channel.lastMessage ? new Date(channel.lastMessage) : undefined,
            error: channel.error || undefined
          });
        });
      } else if (typeof channelData === 'object') {
        Object.entries(channelData).forEach(([name, data]: [string, any]) => {
          channels.push({
            name,
            type: data.type || name,
            status: data.status === 'active' || data.enabled ? 'active' : 'inactive',
            messageCount: data.messageCount || data.messages || 0,
            lastMessage: data.lastMessage ? new Date(data.lastMessage) : undefined,
            error: data.error || undefined
          });
        });
      }
    } catch (error) {
      console.error('Error parsing channel health:', error);
    }

    return channels;
  }

  /**
   * 🔐 BUILD AUTHENTICATION HEADERS
   * 
   * Creates HTTP headers for Gateway authentication.
   * This handles different auth methods (token, password, none).
   * 
   * @param auth - Authentication information
   * @returns HTTP headers for API requests
   */
  private static buildAuthHeaders(auth?: AuthInfo): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'originCheck/1.1.0'
    };

    if (auth?.type === 'token' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth?.type === 'password' && auth.credentials) {
      // Handle password-based auth if needed
      headers['Authorization'] = `Basic ${Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64')}`;
    }

    return headers;
  }

  /**
   * ❌ CREATE UNHEALTHY HEALTH OBJECT
   * 
   * Creates a standardized unhealthy health response.
   * This ensures consistent error reporting.
   * 
   * @param url - Gateway URL that failed
   * @param error - Error message
   * @param responseTime - How long the failed request took
   * @returns Unhealthy health object
   */
  private static createUnhealthyHealth(url: string, error: string, responseTime: number): GatewayHealth {
    return {
      status: 'unhealthy',
      url,
      responseTime,
      error,
      lastChecked: new Date()
    };
  }

  /**
   * 🔄 CONTINUOUS HEALTH MONITORING
   * 
   * Sets up ongoing health monitoring with callbacks.
   * This enables real-time monitoring dashboards.
   * 
   * @param gatewayURL - Gateway URL to monitor
   * @param authInfo - Authentication info
   * @param callback - Function to call with health updates
   * @param interval - How often to check (default: 30 seconds)
   * @returns Interval ID for cleanup
   */
  static startContinuousMonitoring(
    gatewayURL: string, 
    authInfo: AuthInfo | undefined,
    callback: (health: GatewayHealth) => void,
    interval: number = 30000
  ): NodeJS.Timeout {
    console.log(`🔄 Starting continuous monitoring for: ${gatewayURL}`);
    
    // Initial check
    this.checkGatewayHealth(gatewayURL, authInfo).then(callback);
    
    // Set up recurring checks
    return setInterval(async () => {
      const health = await this.checkGatewayHealth(gatewayURL, authInfo);
      callback(health);
    }, interval);
  }

  /**
   * 🛑 STOP CONTINUOUS MONITORING
   * 
   * Cleans up monitoring intervals.
   * Always call this to prevent memory leaks.
   * 
   * @param intervalId - Interval ID from startContinuousMonitoring
   */
  static stopContinuousMonitoring(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('🛑 Stopped continuous monitoring');
  }
}
