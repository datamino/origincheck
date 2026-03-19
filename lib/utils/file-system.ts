import * as fs from 'fs/promises';
import * as path from 'path';
import { OpenClawConfig, OSInfo } from '../types/config';

export class CrossPlatformFileSystem {
  /**
   * Get all possible OpenClaw config file paths based on OS
   */
  static getConfigPaths(): string[] {
    const paths = [];
    
    if (process.platform === 'win32') {
      // Windows paths
      const userProfile = process.env.USERPROFILE || '';
      paths.push(path.join(userProfile, '.openclaw', 'openclaw.json'));
      paths.push(path.join(userProfile, 'openclaw', 'openclaw.json'));
      paths.push(path.join(userProfile, 'AppData', 'Local', 'openclaw', 'openclaw.json'));
    } else {
      // Unix paths (macOS/Linux)
      const home = process.env.HOME || '';
      paths.push(path.join(home, '.openclaw', 'openclaw.json'));
      paths.push(path.join(home, '.config', 'openclaw', 'openclaw.json'));
      paths.push(path.join(home, 'openclaw', 'openclaw.json'));
    }
    
    return paths;
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content safely
   */
  static async readFile(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write file content safely
   */
  static async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Parse JSON config safely
   */
  static parseConfig(content: string): OpenClawConfig | null {
    try {
      const config = JSON.parse(content);
      return config as OpenClawConfig;
    } catch (error) {
      console.error('Error parsing JSON config:', error);
      return null;
    }
  }

  /**
   * Validate config structure
   */
  static validateConfig(config: any): config is OpenClawConfig {
    return (
      typeof config === 'object' &&
      config !== null &&
      (config.gateway === undefined || typeof config.gateway === 'object')
    );
  }

  /**
   * Get OS-specific information
   */
  static getOSInfo(): OSInfo {
    return {
      platform: process.platform,
      arch: process.arch,
      home: process.env.HOME || process.env.USERPROFILE || '',
      isWindows: process.platform === 'win32',
      isMacOS: process.platform === 'darwin',
      isLinux: process.platform === 'linux'
    };
  }
}
