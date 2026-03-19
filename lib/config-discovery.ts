import * as readline from 'readline';
import { CrossPlatformFileSystem } from './utils/file-system.js';
import { OpenClawConfig, ConfigDiscoveryResult, ConfigWizardStep, GatewayConfig, AuthInfo, EnhancedConfigResult, GatewayHealth } from './types/config.js';
import { GatewayHealthMonitor } from './gateway-health.js';

export class UniversalConfigReader {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Main discovery method with fallback mechanisms
   */
  async discoverConfig(): Promise<ConfigDiscoveryResult> {
    console.log('🦞 originCheck - OpenClaw Configuration Discovery\n');

    // Level 1: Try auto-discovery first
    console.log('🔍 Searching for OpenClaw configuration...');
    const autoResult = await this.tryAutoDiscovery();
    
    if (autoResult.config) {
      console.log(`✅ Found OpenClaw config at: ${autoResult.path}`);
      return autoResult;
    }

    console.log('❌ Could not find OpenClaw configuration automatically.\n');
    
    // Level 2+: Fallback to interactive wizard
    return await this.showConfigWizard();
  }

  /**
   * Level 1: Auto-discovery from standard paths
   */
  private async tryAutoDiscovery(): Promise<ConfigDiscoveryResult> {
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

  /**
   * Level 2-5: Interactive fallback wizard
   */
  private async showConfigWizard(): Promise<ConfigDiscoveryResult> {
    let currentStep: ConfigWizardStep = 'welcome';
    
    while (currentStep !== 'skip') {
      switch (currentStep) {
        case 'welcome':
          currentStep = await this.showWelcomeStep();
          break;
        case 'browse':
          return await this.showBrowseStep();
        case 'manual-path':
          return await this.showManualPathStep();
        case 'create-sample':
          return await this.showCreateSampleStep();
        case 'skip':
          return { 
            config: null, 
            source: 'fallback', 
            path: null, 
            error: 'User chose to skip configuration'
          };
      }
    }

    return { 
      config: null, 
      source: 'fallback', 
      path: null, 
      error: 'User chose to skip configuration'
    };
  }

  /**
   * Welcome step - show options
   */
  private async showWelcomeStep(): Promise<ConfigWizardStep> {
    console.log('\n📋 OpenClaw Configuration Options:\n');
    console.log('1) Browse for config file manually');
    console.log('2) Enter config file path manually');
    console.log('3) Create sample configuration');
    console.log('4) Skip for now (use defaults)\n');

    const choice = await this.askQuestion('Choose an option (1-4): ');
    
    switch (choice.trim()) {
      case '1':
        return 'browse';
      case '2':
        return 'manual-path';
      case '3':
        return 'create-sample';
      case '4':
        return 'skip';
      default:
        console.log('❌ Invalid choice. Please try again.\n');
        return 'welcome';
    }
  }

  /**
   * Browse step - manual file selection
   */
  private async showBrowseStep(): Promise<ConfigDiscoveryResult> {
    console.log('\n📁 Manual Config File Selection\n');
    console.log('Please enter the full path to your openclaw.json file:');
    console.log('Example: /home/user/.openclaw/openclaw.json');
    console.log('Example: C:\\Users\\User\\.openclaw\\openclaw.json\n');

    return await this.showManualPathStep();
  }

  /**
   * Manual path step - user enters path
   */
  private async showManualPathStep(): Promise<ConfigDiscoveryResult> {
    const path = await this.askQuestion('Enter config file path (or "back" to return): ');
    
    if (path.trim().toLowerCase() === 'back') {
      return await this.showConfigWizard();
    }

    if (!path.trim()) {
      console.log('❌ Please enter a valid path.\n');
      return await this.showManualPathStep();
    }

    console.log(`\n🔍 Checking: ${path}`);
    
    if (!(await CrossPlatformFileSystem.fileExists(path))) {
      console.log('❌ File does not exist.\n');
      return await this.showManualPathStep();
    }

    try {
      const content = await CrossPlatformFileSystem.readFile(path);
      if (!content) {
        console.log('❌ Could not read file.\n');
        return await this.showManualPathStep();
      }

      const config = CrossPlatformFileSystem.parseConfig(content);
      if (!config) {
        console.log('❌ Invalid JSON format.\n');
        return await this.showManualPathStep();
      }

      if (!CrossPlatformFileSystem.validateConfig(config)) {
        console.log('❌ Invalid OpenClaw configuration structure.\n');
        return await this.showManualPathStep();
      }

      console.log('✅ Valid OpenClaw configuration found!\n');
      return { 
        config, 
        source: 'user-provided', 
        path,
        error: undefined
      };
    } catch (error) {
      console.log(`❌ Error reading config: ${error}\n`);
      return await this.showManualPathStep();
    }
  }

  /**
   * Create sample step - generate sample config
   */
  private async showCreateSampleStep(): Promise<ConfigDiscoveryResult> {
    console.log('\n📝 Create Sample Configuration\n');
    console.log('This will create a sample openclaw.json file in your home directory.\n');

    const osInfo = CrossPlatformFileSystem.getOSInfo();
    let defaultPath: string;
    
    if (osInfo.isWindows) {
      defaultPath = `${osInfo.home}\\.openclaw\\openclaw.json`;
    } else {
      defaultPath = `${osInfo.home}/.openclaw/openclaw.json`;
    }

    console.log(`Default location: ${defaultPath}`);
    const useDefault = await this.askQuestion('Use default location? (y/n): ');
    
    let configPath = defaultPath;
    if (useDefault.trim().toLowerCase() !== 'y') {
      configPath = await this.askQuestion('Enter custom path: ');
    }

    const sampleConfig: OpenClawConfig = {
      gateway: {
        url: "http://localhost:18789",
        port: 18789,
        auth: {
          type: "none"
        }
      },
      channels: {},
      sessions: {},
      workspace: osInfo.home
    };

    const success = await CrossPlatformFileSystem.writeFile(
      configPath, 
      JSON.stringify(sampleConfig, null, 2)
    );

    if (success) {
      console.log(`✅ Sample configuration created at: ${configPath}\n`);
      return { 
        config: sampleConfig, 
        source: 'user-provided', 
        path: configPath,
        error: undefined
      };
    } else {
      console.log('❌ Failed to create sample configuration.\n');
      return await this.showConfigWizard();
    }
  }

  /**
   * Helper method to ask user questions
   */
  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * 🔧 GATEWAY URL CONSTRUCTION
   * 
   * Builds Gateway URL from OpenClaw configuration.
   * This converts port/mode/bind into a working URL.
   * 
   * Examples:
   * - { port: 18789, mode: "local", bind: "loopback" } → "http://localhost:18789"
   * - { port: 8080, mode: "remote", bind: "all" } → "http://0.0.0.0:8080"
   * 
   * @param config - OpenClaw configuration
   * @returns Gateway URL or null if not constructable
   */
  constructGatewayURL(config: OpenClawConfig): string | null {
    const gateway = config.gateway as GatewayConfig;
    if (!gateway) {
      console.log('❌ No gateway configuration found');
      return null;
    }

    const port = gateway.port || 18789;
    const mode = gateway.mode || 'local';
    const bind = gateway.bind || 'loopback';

    // Construct URL based on mode and bind
    let host: string;
    
    switch (mode) {
      case 'local':
        host = this.getLocalHost(bind);
        break;
      case 'remote':
        host = this.getRemoteHost(bind);
        break;
      case 'tailscale':
        host = this.getTailscaleHost(bind);
        break;
      default:
        host = 'localhost';
    }

    const url = `http://${host}:${port}`;
    console.log(`🔧 Constructed Gateway URL: ${url} (mode: ${mode}, bind: ${bind})`);
    
    return url;
  }

  /**
   * 🏠 GET LOCAL HOST ADDRESS
   * 
   * Determines host address for local mode.
   * 
   * @param bind - Bind configuration
   * @returns Host address
   */
  private getLocalHost(bind: string): string {
    switch (bind) {
      case 'loopback':
        return 'localhost';
      case 'all':
      case 'public':
        return '0.0.0.0';
      default:
        return 'localhost';
    }
  }

  /**
   * 🌍 GET REMOTE HOST ADDRESS
   * 
   * Determines host address for remote mode.
   * 
   * @param bind - Bind configuration
   * @returns Host address
   */
  private getRemoteHost(bind: string): string {
    switch (bind) {
      case 'all':
      case 'public':
        return '0.0.0.0';
      case 'loopback':
        return 'localhost';
      default:
        return '0.0.0.0';
    }
  }

  /**
   * 🐉 GET TAILSCALE HOST ADDRESS
   * 
   * Determines host address for Tailscale mode.
   * 
   * @param bind - Bind configuration
   * @returns Host address
   */
  private getTailscaleHost(bind: string): string {
    // Tailscale typically uses 100.x.x.x addresses
    // For now, default to localhost
    return 'localhost';
  }

  /**
   * 🔐 AUTHENTICATION DETECTION
   * 
   * Extracts authentication information from OpenClaw config.
   * This prepares auth for Gateway API calls.
   * 
   * @param config - OpenClaw configuration
   * @returns Authentication information
   */
  detectAuthMethod(config: OpenClawConfig): AuthInfo {
    const gateway = config.gateway as GatewayConfig;
    
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

  /**
   * 🌐 GATEWAY URL VALIDATION
   * 
   * Validates if a Gateway URL is properly formatted.
   * 
   * @param url - Gateway URL to validate
   * @returns True if URL is valid
   */
  validateGatewayURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 🔌 GATEWAY CONNECTION TEST
   * 
   * Tests if Gateway is reachable at the specified URL.
   * This is a basic connectivity test.
   * 
   * @param url - Gateway URL to test
   * @param auth - Authentication information
   * @returns True if Gateway is reachable
   */
  async testGatewayConnection(url: string, auth?: AuthInfo): Promise<boolean> {
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

  /**
   * 🏥 COMPLETE GATEWAY DISCOVERY
   * 
   * Performs complete Gateway discovery including URL construction,
   * auth detection, and health testing.
   * 
   * @returns Enhanced configuration result with Gateway information
   */
  async discoverGateway(): Promise<EnhancedConfigResult> {
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
    let gatewayHealth: GatewayHealth | undefined;
    if (isConnected) {
      console.log('\n🏥 Step 5: Getting Gateway health...');
      gatewayHealth = await GatewayHealthMonitor.checkGatewayHealth(gatewayURL, authInfo);
      
      console.log(`📋 Gateway Status: ${gatewayHealth.status}`);
      console.log(`📋 Response Time: ${gatewayHealth.responseTime}ms`);
      if (gatewayHealth.uptime) {
        console.log(`📋 Uptime: ${gatewayHealth.uptime}s`);
      }
      if (gatewayHealth.version) {
        console.log(`📋 Version: ${gatewayHealth.version}`);
      }
    }

    const result: EnhancedConfigResult = {
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

  /**
   * Cleanup readline interface
   */
  close(): void {
    this.rl.close();
  }
}
