import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AiSettingsService } from './ai-settings.service';

export interface Passage {
  title: string;
  text: string;
  topic: string;
  level: string;
  wordCount: number;
  questions: Question[];
  vocabulary: VocabWord[];
}

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
      /* options: {
        include_thinking: false 
      } */
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

  async loadPassage(level: string): Promise<Passage> {
    const topics = ['animals','space','oceans','science','plants','weather','ancient civilizations','technology', 'barbados',
      'environment','rainforests','inventors','human body', 'dragon ball z', 'pokemon', 'bluey', 'minecraft'];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const levelDesc = level === 'elementary'
      ? 'grades 3-5, age 7-11, simple vocabulary, 110-140 words'
      : 'grades 6-8, age 11-14, moderate vocabulary, 160-190 words';
    const wordCountRule = level === 'elementary' ? 120 : 200;

    const prompt = `Create a reading comprehension passage for ${levelDesc} about ${topic}.
Rules:
- Passage must be exactly 110–140 words (count carefully). Use simple, grade-appropriate vocabulary.
- The wordCount field must reflect the actual word count of "text".
- Questions must cover different skills: literal recall, inference, vocabulary in context, and critical thinking.
- MC questions must have one clearly correct answer and three plausible distractors — avoid trick questions.
- Vocabulary words must appear in the passage and be words a student might not know.

Return ONLY valid JSON, no markdown:
{
  "title": "passage title",
  "text": "the passage",
  "topic": "${topic}",
  "level": "${level === 'elementary' ? 'Grade 3–5' : 'Grade 6–8'}",
  "wordCount": ${wordCountRule},
  "questions": [
    {"type":"mc","q":"question?","options":["A) opt","B) opt","C) opt","D) opt"],"answer":"A","explanation":"why"},
    {"type":"mc","q":"question?","options":["A) opt","B) opt","C) opt","D) opt"],"answer":"B","explanation":"why"},
    {"type":"tf","q":"True or False: statement","answer":"True","explanation":"explanation"},
    {"type":"short","q":"Open question","sampleAnswer":"model answer","keywords":["key1","key2"]},
    {"type":"fill","before":"Start of sentence ","answer":"missing word","after":" rest.","hint":"category hint"}
  ],
  "vocabulary": [
    {"word":"word1","definition":"simple def","example":"example sentence"},
    {"word":"word2","definition":"simple def","example":"example sentence"},
    {"word":"word3","definition":"simple def","example":"example sentence"},
    {"word":"word4","definition":"simple def","example":"example sentence"}
  ]
}`;
    const raw = await this.callAI(prompt);
    console.log('Generated passage:', raw);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
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

  async generatePassage(topic: string, level: string): Promise<{ title: string; text: string; topic: string; level: string }> {
    const levelDesc = level === 'elementary' ? 'grade 2-5, 110-140 word' : 'grade 6-8, 160-190 word';
    const prompt = `Write a ${levelDesc} reading comprehension passage about: ${topic}.
Return ONLY JSON: {"title":"...","text":"...","topic":"${topic}","level":"${level === 'elementary' ? 'Grade 3–5' : 'Grade 6–8'}"}`;
    const raw = await this.callAI(prompt, 600);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  }
}
