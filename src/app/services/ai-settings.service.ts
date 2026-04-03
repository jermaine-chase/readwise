import { Injectable } from '@angular/core';

export type AiProvider = 'claude' | 'openai' | 'gemini' | 'azure' | 'deepseek' | 'local';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  azureEndpoint: string;
  localEndpoint: string;
  localModel: string;
}

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'claude',
  apiKey: '',
  azureEndpoint: '',
  localEndpoint: 'http://localhost:11434/api/generate',
  localModel: 'llama3.2',
};

@Injectable({ providedIn: 'root' })
export class AiSettingsService {
  private readonly KEY = 'rw_ai_settings';

  getSettings(): AiSettings {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings: AiSettings): void {
    localStorage.setItem(this.KEY, JSON.stringify(settings));
  }

  get provider(): AiProvider {
    return this.getSettings().provider;
  }

  get apiKey(): string {
    return this.getSettings().apiKey;
  }

  get azureEndpoint(): string {
    return this.getSettings().azureEndpoint;
  }
}
