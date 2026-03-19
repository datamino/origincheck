import * as readline from 'readline';
import { CrossPlatformFileSystem } from './utils/file-system.js';
import { OpenClawConfig, ConfigDiscoveryResult, ConfigWizardStep } from './types/config.js';

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
   * Cleanup readline interface
   */
  close(): void {
    this.rl.close();
  }
}
