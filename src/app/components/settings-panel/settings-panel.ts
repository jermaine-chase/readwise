import { Component, OnInit } from '@angular/core';
import { AiSettingsService, AiSettings, AiProvider } from '../../services/ai-settings.service';

interface ProviderOption {
  value: AiProvider;
  label: string;
  description: string;
  keyLabel: string;
  keyPlaceholder: string;
  docsUrl: string;
}

@Component({
  standalone: false,
  selector: 'app-settings-panel',
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
})
export class SettingsPanel implements OnInit {
  settings: AiSettings = { provider: 'claude', apiKey: '', azureEndpoint: '', localEndpoint: 'http://localhost:11434/api/generate', localModel: 'llama3.2' };
  showKey = false;
  saved = false;
  saveTimer: any;

  readonly providers: ProviderOption[] = [
    {
      value: 'claude',
      label: 'Claude (Anthropic)',
      description: 'Anthropic\'s Claude — the default AI powering this app.',
      keyLabel: 'Anthropic API Key',
      keyPlaceholder: 'sk-ant-...',
      docsUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
      value: 'openai',
      label: 'ChatGPT (OpenAI)',
      description: 'OpenAI\'s GPT-4o model for reading comprehension tasks.',
      keyLabel: 'OpenAI API Key',
      keyPlaceholder: 'sk-...',
      docsUrl: 'https://platform.openai.com/api-keys',
    },
    {
      value: 'gemini',
      label: 'Gemini (Google)',
      description: 'Google\'s Gemini 2.0 Flash model.',
      keyLabel: 'Google AI API Key',
      keyPlaceholder: 'AIza...',
      docsUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
      value: 'azure',
      label: 'Azure OpenAI (Copilot)',
      description: 'Microsoft Azure OpenAI — compatible with GitHub Copilot deployments.',
      keyLabel: 'Azure API Key',
      keyPlaceholder: 'Your Azure OpenAI key',
      docsUrl: 'https://portal.azure.com',
    },
    {
      value: 'deepseek',
      label: 'DeepSeek',
      description: 'DeepSeek V3 — a powerful and cost-efficient open-source model.',
      keyLabel: 'DeepSeek API Key',
      keyPlaceholder: 'sk-...',
      docsUrl: 'https://platform.deepseek.com/api_keys',
    },
    {
      value: 'local',
      label: 'Local Model',
      description: 'Any locally hosted model via Ollama, LM Studio, or compatible server.',
      keyLabel: 'API Key (optional)',
      keyPlaceholder: 'Leave blank if not required',
      docsUrl: 'https://ollama.com',
    },
  ];

  constructor(private aiSettings: AiSettingsService) {}

  ngOnInit(): void {
    this.settings = this.aiSettings.getSettings();
  }

  get selectedProvider(): ProviderOption {
    return this.providers.find(p => p.value === this.settings.provider)!;
  }

  save(): void {
    this.aiSettings.saveSettings(this.settings);
    this.saved = true;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => (this.saved = false), 2500);
  }

  toggleShowKey(): void {
    this.showKey = !this.showKey;
  }

  onProviderChange(): void {
    this.settings.apiKey = '';
    this.settings.azureEndpoint = '';
    this.settings.localEndpoint = 'http://localhost:11434/api/generate';
    this.settings.localModel = 'llama3.2';
  }
}
