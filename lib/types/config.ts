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
