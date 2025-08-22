import { Finding, OsintContext } from '@/types';

export interface LLMProvider {
  analyzeContext(context: OsintContext, prompt: string): Promise<string>;
  extractFindings(text: string): Promise<Finding[]>;
  generateSummary(findings: Finding[]): Promise<string>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

// Factory to create LLM providers
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'local':
      return new LocalLLMProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

// Local LLM implementation for OSS models
class LocalLLMProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:8080'; // Default for local inference
    this.model = config.model || 'oss-120b';
    this.maxTokens = config.maxTokens || 2048;
    this.temperature = config.temperature || 0.7;
  }

  async analyzeContext(context: OsintContext, prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: this.formatPrompt(context, prompt),
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].text;
  }

  async extractFindings(text: string): Promise<Finding[]> {
    const prompt = `Extract automation opportunities from the following analysis. Return as JSON array with title, detail, confidence (0-1), tags, and sources fields:\n\n${text}\n\nJSON:`;
    
    const response = await this.complete(prompt);
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse findings:', error);
      return [];
    }
  }

  async generateSummary(findings: Finding[]): Promise<string> {
    const prompt = `Summarize these automation opportunity findings in 2-3 sentences:\n${JSON.stringify(findings, null, 2)}`;
    return this.complete(prompt);
  }

  private formatPrompt(context: OsintContext, userPrompt: string): string {
    return `Company: ${context.companyName}
Domain: ${context.domain}
Jobs: ${context.jobs.length} open positions
Tech Stack: ${context.tech.map(t => t.name || t.product).join(', ')}
News Items: ${context.news.length}

${userPrompt}`;
  }

  private async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].text.trim();
  }
}

// Stub implementations for API providers
class OpenAIProvider implements LLMProvider {
  constructor(private config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key required');
    }
  }

  async analyzeContext(context: OsintContext, prompt: string): Promise<string> {
    // Would implement OpenAI API calls here
    throw new Error('OpenAI provider not implemented - use local LLM instead');
  }

  async extractFindings(text: string): Promise<Finding[]> {
    throw new Error('OpenAI provider not implemented - use local LLM instead');
  }

  async generateSummary(findings: Finding[]): Promise<string> {
    throw new Error('OpenAI provider not implemented - use local LLM instead');
  }
}

class AnthropicProvider implements LLMProvider {
  constructor(private config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key required');
    }
  }

  async analyzeContext(context: OsintContext, prompt: string): Promise<string> {
    // Would implement Anthropic API calls here
    throw new Error('Anthropic provider not implemented - use local LLM instead');
  }

  async extractFindings(text: string): Promise<Finding[]> {
    throw new Error('Anthropic provider not implemented - use local LLM instead');
  }

  async generateSummary(findings: Finding[]): Promise<string> {
    throw new Error('Anthropic provider not implemented - use local LLM instead');
  }
}

// Default export for easy configuration
export function getLLMProvider(): LLMProvider {
  const config: LLMConfig = {
    provider: (process.env.LLM_PROVIDER as any) || 'local',
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL || 'http://localhost:8080',
    model: process.env.LLM_MODEL || 'oss-120b',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  };

  return createLLMProvider(config);
}