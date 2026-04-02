import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  private readonly API = 'https://api.anthropic.com/v1/messages';
  private readonly MODEL = 'claude-sonnet-4-20250514';

  constructor(private http: HttpClient) {}

  private async callClaude(content: string, maxTokens = 1500): Promise<string> {
    const body = {
      model: this.MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }]
    };
    const res: any = await firstValueFrom(
      this.http.post(this.API, body, { headers: { 'Content-Type': 'application/json' } })
    );
    return res.content.map((c: any) => c.text ?? '').join('');
  }

  async loadPassage(level: string): Promise<Passage> {
    const topics = ['animals','space','oceans','history','plants','weather','ancient civilizations','technology','environment','rainforests','inventors','human body'];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const levelDesc = level === 'elementary'
      ? 'grades 2-5, age 7-11, simple vocabulary, 110-140 words'
      : 'grades 6-8, age 11-14, moderate vocabulary, 160-190 words';

    const prompt = `Create a reading comprehension passage for ${levelDesc} about ${topic}.
Return ONLY valid JSON, no markdown:
{
  "title": "passage title",
  "text": "the passage",
  "topic": "${topic}",
  "level": "${level === 'elementary' ? 'Grade 3–5' : 'Grade 6–8'}",
  "wordCount": <number>,
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
    const raw = await this.callClaude(prompt);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  }

  async checkShortAnswer(passage: string, question: string, sampleAnswer: string, keywords: string[], studentAnswer: string): Promise<{ score: 'correct' | 'partial' | 'wrong'; feedback: string }> {
    const prompt = `Passage: "${passage}"
Question: "${question}"
Sample answer: "${sampleAnswer}"
Keywords: ${JSON.stringify(keywords)}
Student answer: "${studentAnswer}"
Respond ONLY with JSON: {"score":"correct"|"partial"|"wrong","feedback":"1-2 encouraging sentences for a kid"}`;
    const raw = await this.callClaude(prompt, 300);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  }

  async checkSummary(passage: string, title: string, summary: string, level: string): Promise<string> {
    const prompt = `You are a warm, encouraging reading teacher for ${level === 'elementary' ? 'elementary' : 'middle'} school students.
Passage: "${passage}"
Student summary: "${summary}"
Give friendly feedback in 3-4 sentences. 1) What they did well. 2) One improvement. 3) Encouragement.
Start with 🌟 if excellent, 👍 if good, 💪 if needs work. Max 90 words.`;
    return this.callClaude(prompt, 400);
  }

  async generatePassage(topic: string, level: string): Promise<{ title: string; text: string; topic: string; level: string }> {
    const levelDesc = level === 'elementary' ? 'grade 2-5, 110-140 word' : 'grade 6-8, 160-190 word';
    const prompt = `Write a ${levelDesc} reading comprehension passage about: ${topic}.
Return ONLY JSON: {"title":"...","text":"...","topic":"${topic}","level":"${level === 'elementary' ? 'Grade 3–5' : 'Grade 6–8'}"}`;
    const raw = await this.callClaude(prompt, 600);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  }
}
