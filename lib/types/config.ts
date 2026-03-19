export interface OpenClawConfig {
  gateway?: {
    url?: string;
    port?: number;
    auth?: {
      type?: 'none' | 'token' | 'password';
      token?: string;
    };
  };
  channels?: Record<string, any>;
  sessions?: Record<string, any>;
  workspace?: string;
}

export interface ConfigDiscoveryResult {
  config: OpenClawConfig | null;
  source: 'auto-discovered' | 'user-provided' | 'fallback';
  path: string | null;
  error?: string;
}

export type ConfigWizardStep = 'welcome' | 'browse' | 'manual-path' | 'create-sample' | 'skip';

export interface ConfigWizardOptions {
  showBrowse?: boolean;
  showManualPath?: boolean;
  showCreateSample?: boolean;
  showSkip?: boolean;
}

export interface OSInfo {
  platform: string;
  arch: string;
  home: string;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
}

// Gateway Configuration Types
export interface GatewayConfig {
  url?: string;
  port?: number;
  mode?: 'local' | 'remote' | 'tailscale';
  bind?: 'loopback' | 'all' | 'public';
  auth?: {
    mode?: 'none' | 'token' | 'password';
    token?: string;
  };
}

// Auth Information Types
export interface AuthInfo {
  type: 'none' | 'token' | 'password';
  token?: string;
  credentials?: any;
}

// Gateway Health Types
export interface GatewayHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  url?: string;
  responseTime?: number;
  uptime?: number;
  version?: string;
  error?: string;
  channels?: ChannelHealth[];
  memory?: MemoryInfo;
  lastChecked?: Date;
}

export interface ChannelHealth {
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  messageCount?: number;
  lastMessage?: Date;
  error?: string;
}

export interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
}

// Enhanced Config Discovery Result
export interface EnhancedConfigResult extends ConfigDiscoveryResult {
  gatewayURL?: string;
  gatewayURLValid?: boolean;
  gatewayConnection?: boolean;
  gatewayHealth?: GatewayHealth;
  authInfo?: AuthInfo;
}
