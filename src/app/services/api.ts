import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AiSettingsService } from './ai-settings.service';
import { jsonrepair } from 'jsonrepair';

export interface Passage {
  title: string;
  text: string;
  topic: string;
  level: string;
  wordCount: number;
  questions: Question[];
  vocabulary: VocabWord[];
}
;8
export interface Question {
  type: 'mc' | 'tf' | 'short' | 'fill';
  q: string;
  // mc
  options?: string[];
  answer?: string;
  explanation?: string;
  // short
  sampleAnswer?: string;
  keywords?: string[];
  // fill
  before?: string;
  after?: string;
  hint?: string;
}

export interface VocabWord {
  word: string;
  definition: string;
  example: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private aiSettings: AiSettingsService) {}

  private async callAI(content: string, maxTokens = 6000): Promise<string> {
    const { provider, apiKey, azureEndpoint, localEndpoint, localModel } = this.aiSettings.getSettings();

    switch (provider) {
      case 'openai':
        return this.callOpenAI(content, maxTokens, apiKey);
      case 'gemini':
        return this.callGemini(content, maxTokens, apiKey);
      case 'azure':
        return this.callAzure(content, maxTokens, apiKey, azureEndpoint);
      case 'deepseek':
        return this.callDeepSeek(content, maxTokens, apiKey);
      case 'local':
        return this.callLocal(content, maxTokens, localEndpoint, localModel, apiKey);
      case 'claude':
      default:
        return this.callClaude(content, maxTokens, apiKey);
    }
  }

  private async callLocal(content: string, maxTokens: number, endpoint: string, model: string, apiKey: string): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      prompt: content,
      // messages: [{ role: 'user', content }],
      stream: false,
      think: false,
    });

    const response = await fetch(endpoint, { method: 'POST', headers, body });
    if (!response.ok) {
      throw new Error(`Local model request failed: ${response.status} ${response.statusText}`);
    }

    // Ollama native API (/api/generate) with stream:false returns a single JSON
    // object where the answer is in `response`. The `thinking` field is ignored.
    const res = await response.json();
    return (res.response ?? '').trim();
  }

  private async callDeepSeek(content: string, maxTokens: number, apiKey: string): Promise<string> {
    const body = {
      model: 'deepseek-chat',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }]
    };
    const res: any = await firstValueFrom(
      this.http.post('https://api.deepseek.com/chat/completions', body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      })
    );
    return res.choices?.[0]?.message?.content ?? '';
  }

  private async callClaude(content: string, maxTokens: number, apiKey: string): Promise<string> {
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }]
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res: any = await firstValueFrom(
      this.http.post('https://api.anthropic.com/v1/messages', body, { headers })
    );
    return res.content.map((c: any) => c.text ?? '').join('');
  }

  private async callOpenAI(content: string, maxTokens: number, apiKey: string): Promise<string> {
    const body = {
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }]
    };
    const res: any = await firstValueFrom(
      this.http.post('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      })
    );
    return res.choices?.[0]?.message?.content ?? '';
  }

  private async callGemini(content: string, maxTokens: number, apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: content }] }],
      generationConfig: { maxOutputTokens: maxTokens }
    };
    const res: any = await firstValueFrom(
      this.http.post(url, body, { headers: { 'Content-Type': 'application/json' } })
    );
    return res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  private async callAzure(content: string, maxTokens: number, apiKey: string, endpoint: string): Promise<string> {
    const body = {
      messages: [{ role: 'user', content }],
      max_tokens: maxTokens,
    };
    const res: any = await firstValueFrom(
      this.http.post(endpoint, body, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        }
      })
    );
    return res.choices?.[0]?.message?.content ?? '';
  }

  private buildPassagePrompt(topic: string, level: string): string {
    const minWordCount = level === 'elementary' ? '110' : '190';
    const maxWordCount = '250';
    const levelDesc = level === 'elementary'
      ? `grades 3-5, age 7-11, simple vocabulary, ${minWordCount} - ${maxWordCount} words`
      : `grades 6-8, age 11-14, moderate vocabulary, ${minWordCount} - ${maxWordCount} words`;
    const levelLabel = level === 'elementary' ? 'Grade 3–5' : 'Grade 6–8';

    return `Create a reading comprehension passage for ${levelDesc} about ${topic}.

Rules:
- The passage must be include at minimum ${minWordCount} words and at maximum ${maxWordCount} words. Use simple, grade-appropriate vocabulary.
- Count the words in "text" and put the exact count in "wordCount".
- Include exactly 5 questions covering: literal recall (mc), inference (mc), true/false, short answer, and fill-in-the-blank.
- MC questions must have one clearly correct answer and three plausible distractors. Options are labeled "A)", "B)", "C)", "D)" and "answer" is the letter only (e.g. "A").
- The short answer question must be a specific, open-ended question about the passage that requires a 1–2 sentence response.
- Fill in the blank: choose a single important word from the passage. "before" and "after" together must give enough context to make the answer solvable. "hint" names the word's category (e.g. "noun", "animal").
- Vocabulary: choose 4 words that actually appear in the passage and that a student might not know.
- Return ONLY valid JSON — no markdown, no code fences, no extra text.

{
  "title": "passage title",
  "text": "the full passage text",
  "topic": "${topic}",
  "level": "${levelLabel}",
  "questions": [
    {"type":"mc","q":"question?","options":["A) option","B) option","C) option","D) option"],"answer":"A","explanation":"why A is correct"},
    {"type":"mc","q":"question?","options":["A) option","B) option","C) option","D) option"],"answer":"B","explanation":"why B is correct"},
    {"type":"tf","q":"True or False: statement","answer":"True","explanation":"evidence from the passage"},
    {"type":"short","q":"question?","sampleAnswer":"model answer","keywords":["key1","key2"]},
    {"type":"fill","before":"Start of sentence ","answer":"missing word","after":" rest.","hint":"category hint"}
  ],
  "vocabulary": [
    {"word":"word1","definition":"simple def","example":"example sentence"},
    {"word":"word2","definition":"simple def","example":"example sentence"},
    {"word":"word3","definition":"simple def","example":"example sentence"},
    {"word":"word4","definition":"simple def","example":"example sentence"}
  ]
}`;
  }

  async loadPassage(level: string): Promise<Passage> {
    const topics = ['animals','space','oceans','science','plants','weather','ancient civilizations','technology', 'barbados',
      'environment','rainforests','inventors','human body', 'dragon ball z', 'pokemon', 'bluey', 'minecraft'];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const raw = await this.callAI(this.buildPassagePrompt(topic, level));
    const repaired = jsonrepair(raw);
    return JSON.parse(repaired);
  }

  async checkShortAnswer(passage: string, question: string, sampleAnswer: string, keywords: string[], studentAnswer: string): Promise<{ score: 'correct' | 'partial' | 'wrong'; feedback: string }> {
    const prompt = `Passage: "${passage}"
Question: "${question}"
Sample answer: "${sampleAnswer}"
Keywords: ${JSON.stringify(keywords)}
Student answer: "${studentAnswer}"
Respond ONLY with JSON: {"score":"correct"|"partial"|"wrong","feedback":"1-2 encouraging sentences for a kid"}`;
    const raw = await this.callAI(prompt, 300);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  }

  async checkSummary(passage: string, title: string, summary: string, level: string): Promise<string> {
    const prompt = `You are a warm, encouraging reading teacher for ${level === 'elementary' ? 'elementary' : 'middle'} school students.
Passage: "${passage}"
Student summary: "${summary}"
Give friendly feedback in 3-4 sentences. 1) What they did well. 2) One improvement. 3) Encouragement.
Start with 🌟 if excellent, 👍 if good, 💪 if needs work. Max 90 words.`;
    return this.callAI(prompt, 400);
  }

  async generatePassage(topic: string, level: string): Promise<Passage> {
    const raw = await this.callAI(this.buildPassagePrompt(topic, level));
    const repaired = jsonrepair(raw);
    return JSON.parse(repaired);
  }
}
