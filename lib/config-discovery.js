import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';

// CrossPlatformFileSystem (from Step 1.1)
class CrossPlatformFileSystem {
  static getConfigPaths() {
    const paths = [];
    const home = process.env.HOME || '';
    
    paths.push(path.join(home, '.openclaw', 'openclaw.json'));
    paths.push(path.join(home, '.config', 'openclaw', 'openclaw.json'));
    paths.push(path.join(home, 'openclaw', 'openclaw.json'));
    
    return paths;
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  static parseConfig(content) {
    try {
      const config = JSON.parse(content);
      return config;
    } catch (error) {
      console.error('Error parsing JSON config:', error);
      return null;
    }
  }

  static validateConfig(config) {
    return (
      typeof config === 'object' &&
      config !== null &&
      (config.gateway === undefined || typeof config.gateway === 'object')
    );
  }

  static getOSInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      home: process.env.HOME || '',
      isWindows: process.platform === 'win32',
      isMacOS: process.platform === 'darwin',
      isLinux: process.platform === 'linux'
    };
  }
}

// GatewayHealthMonitor (simplified)
class GatewayHealthMonitor {
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
}

// UniversalConfigReader with Step 1.2 features
export class UniversalConfigReader {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async discoverConfig() {
    console.log('🦞 originCheck - OpenClaw Configuration Discovery\n');
    console.log('🔍 Searching for OpenClaw configuration...');
    
    const autoResult = await this.tryAutoDiscovery();
    
    if (autoResult.config) {
      console.log(`✅ Found OpenClaw config at: ${autoResult.path}`);
      return autoResult;
    }

    console.log('❌ Could not find OpenClaw configuration automatically.\n');
    return await this.showConfigWizard();
  }

  async tryAutoDiscovery() {
    const paths = CrossPlatformFileSystem.getConfigPaths();
    const osInfo = CrossPlatformFileSystem.getOSInfo();
    
    console.log(`🖥️  OS: ${osInfo.platform} (${osInfo.arch})`);
    console.log(`🏠 Home directory: ${osInfo.home}`);
    console.log(`📁 Checking ${paths.length} possible locations...\n`);

    for (const path of paths) {
      console.log(`   Checking: ${path}`);
      
      if (await CrossPlatformFileSystem.fileExists(path)) {
        console.log(`   ✅ File exists! Reading config...`);
        
        try {
          const content = await CrossPlatformFileSystem.readFile(path);
          if (!content) {
            console.log(`   ❌ Could not read file content`);
            continue;
          }

          const config = CrossPlatformFileSystem.parseConfig(content);
          if (!config) {
            console.log(`   ❌ Invalid JSON format`);
            continue;
          }

          if (!CrossPlatformFileSystem.validateConfig(config)) {
            console.log(`   ❌ Invalid config structure`);
            continue;
          }

          console.log(`   ✅ Valid OpenClaw configuration found!\n`);
          return { 
            config, 
            source: 'auto-discovered', 
            path,
            error: undefined
          };
        } catch (error) {
          console.log(`   ❌ Error: ${error}`);
          continue;
        }
      } else {
        console.log(`   ❌ File not found`);
      }
    }

    return { 
      config: null, 
      source: 'fallback', 
      path: null, 
      error: 'OpenClaw configuration not found in standard locations'
    };
  }

  async showConfigWizard() {
    console.log('\n📋 OpenClaw Configuration Options:\n');
    console.log('1) Browse for config file manually');
    console.log('2) Enter config file path manually');
    console.log('3) Create sample configuration');
    console.log('4) Skip for now (use defaults)\n');

    const choice = await this.askQuestion('Choose an option (1-4): ');
    
    if (choice.trim() === '4') {
      return { 
        config: null, 
        source: 'fallback', 
        path: null, 
        error: 'User chose to skip configuration'
      };
    }

    return { 
      config: null, 
      source: 'fallback', 
      path: null, 
      error: 'User chose to skip configuration'
    };
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  // Step 1.2: Gateway URL Construction
  constructGatewayURL(config) {
    const gateway = config.gateway;
    if (!gateway) {
      console.log('❌ No gateway configuration found');
      return null;
    }

    const port = gateway.port || 18789;
    const mode = gateway.mode || 'local';
    const bind = gateway.bind || 'loopback';

    let host;
    
    switch (mode) {
      case 'local':
        host = bind === 'loopback' ? 'localhost' : '0.0.0.0';
        break;
      case 'remote':
        host = bind === 'loopback' ? 'localhost' : '0.0.0.0';
        break;
      case 'tailscale':
        host = 'localhost';
        break;
      default:
        host = 'localhost';
    }

    const url = `http://${host}:${port}`;
    console.log(`🔧 Constructed Gateway URL: ${url} (mode: ${mode}, bind: ${bind})`);
    
    return url;
  }

  // Step 1.2: Auth Detection
  detectAuthMethod(config) {
    const gateway = config.gateway;
    
    if (!gateway?.auth) {
      console.log('🔐 No authentication configured');
      return { type: 'none' };
    }

    const authMode = gateway.auth.mode || 'none';
    const token = gateway.auth.token;

    switch (authMode) {
      case 'token':
        if (!token) {
          console.log('⚠️  Token auth configured but no token provided');
          return { type: 'none' };
        }
        console.log('🔐 Token authentication detected');
        return { type: 'token', token };
      
      case 'password':
        console.log('🔐 Password authentication detected');
        return { 
          type: 'password', 
          credentials: gateway.auth 
        };
      
      case 'none':
      default:
        console.log('🔐 No authentication required');
        return { type: 'none' };
    }
  }

  // Step 1.2: URL Validation
  validateGatewayURL(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Step 1.2: Gateway Connection Test
  async testGatewayConnection(url, auth) {
    try {
      console.log(`🔌 Testing Gateway connection: ${url}`);
      
      const health = await GatewayHealthMonitor.checkGatewayHealth(url, auth);
      
      if (health.status === 'healthy') {
        console.log(`✅ Gateway connection successful (${health.responseTime}ms)`);
        return true;
      } else {
        console.log(`❌ Gateway connection failed: ${health.error}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Gateway connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  // Step 1.2: Complete Gateway Discovery
  async discoverGateway() {
    console.log('🚀 Starting Gateway Discovery (Step 1.2)\n');

    // Step 1: Use Step 1.1 to find config
    console.log('📋 Step 1: Finding OpenClaw configuration...');
    const configResult = await this.discoverConfig();
    
    if (!configResult.config) {
      console.log('❌ No OpenClaw configuration found');
      return {
        ...configResult,
        gatewayURLValid: false,
        gatewayConnection: false
      };
    }

    console.log(`✅ OpenClaw config found at: ${configResult.path}`);

    // Step 2: Construct Gateway URL
    console.log('\n🔧 Step 2: Constructing Gateway URL...');
    const gatewayURL = this.constructGatewayURL(configResult.config);
    
    if (!gatewayURL) {
      console.log('❌ Failed to construct Gateway URL');
      return {
        ...configResult,
        gatewayURLValid: false,
        gatewayConnection: false
      };
    }

    const isURLValid = this.validateGatewayURL(gatewayURL);
    console.log(`📋 Gateway URL: ${gatewayURL}`);
    console.log(`📋 URL Valid: ${isURLValid}`);

    // Step 3: Detect authentication
    console.log('\n🔐 Step 3: Detecting authentication...');
    const authInfo = this.detectAuthMethod(configResult.config);
    console.log(`📋 Auth Type: ${authInfo.type}`);

    // Step 4: Test Gateway connection
    console.log('\n🔌 Step 4: Testing Gateway connection...');
    const isConnected = await this.testGatewayConnection(gatewayURL, authInfo);

    // Step 5: Get Gateway health (if connected)
    let gatewayHealth;
    if (isConnected) {
      console.log('\n🏥 Step 5: Getting Gateway health...');
      gatewayHealth = await GatewayHealthMonitor.checkGatewayHealth(gatewayURL, authInfo);
      
      console.log(`📋 Gateway Status: ${gatewayHealth.status}`);
      console.log(`📋 Response Time: ${gatewayHealth.responseTime}ms`);
    }

    const result = {
      ...configResult,
      gatewayURL,
      gatewayURLValid: isURLValid,
      gatewayConnection: isConnected,
      gatewayHealth,
      authInfo
    };

    console.log('\n🎉 Gateway Discovery Complete!');
    console.log(`📊 Summary: URL=${gatewayURL}, Valid=${isURLValid}, Connected=${isConnected}, Health=${gatewayHealth?.status || 'unknown'}`);

    return result;
  }

  close() {
    this.rl.close();
  }
}
