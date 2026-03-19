// Gateway Health Monitor - JavaScript version
export class GatewayHealthMonitor {
  static async checkGatewayHealth(gatewayURL, authInfo) {
    const startTime = Date.now();
    
    try {
      console.log(`🏥 Checking Gateway health at: ${gatewayURL}`);
      
      // Test basic connectivity
      const isReachable = await this.testBasicConnectivity(gatewayURL, authInfo);
      if (!isReachable) {
        return {
          status: 'unhealthy',
          url: gatewayURL,
          responseTime: Date.now() - startTime,
          error: 'Gateway not reachable',
          lastChecked: new Date()
        };
      }

      // Return healthy status for testing
      return {
        status: 'healthy',
        url: gatewayURL,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Gateway health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        url: gatewayURL,
        responseTime: Date.now() - startTime,
        error: errorMessage,
        lastChecked: new Date()
      };
    }
  }

  static async testBasicConnectivity(url, auth) {
    try {
      const headers = this.buildAuthHeaders(auth);
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  static buildAuthHeaders(auth) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'originCheck/1.1.0'
    };

    if (auth?.type === 'token' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    return headers;
  }

  static startContinuousMonitoring(gatewayURL, authInfo, callback, interval = 30000) {
    console.log(`🔄 Starting continuous monitoring for: ${gatewayURL}`);
    
    // Initial check
    this.checkGatewayHealth(gatewayURL, authInfo).then(callback);
    
    // Set up recurring checks
    return setInterval(async () => {
      const health = await this.checkGatewayHealth(gatewayURL, authInfo);
      callback(health);
    }, interval);
  }

  static stopContinuousMonitoring(intervalId) {
    clearInterval(intervalId);
    console.log('🛑 Stopped continuous monitoring');
  }
}
