# Readwise

An AI-powered reading comprehension practice app for K–8 students, built with Angular 21.

## Overview

Readwise supports two roles — **students** and **teachers** — with role-based dashboards and an auth guard protecting each route. All data is persisted in `localStorage` (no backend required). AI features are powered by a configurable AI provider (Claude, OpenAI, Gemini, Azure OpenAI, DeepSeek, or a local Ollama model) called directly from the browser.

### Student Features

- **Reading Passages** — AI-generated passages at two difficulty levels: Elementary (Grade 3–5, ~110–140 words) and Middle School (Grade 6–8, ~160–190 words), across randomized topics (animals, space, history, etc.)
- **Three Practice Modes:**
  - **Q&A** — Multiple choice, true/false, short answer (AI-graded), and fill-in-the-blank questions with fuzzy matching
  - **Vocabulary** — Flashcard-style word definitions with example sentences
  - **Summary** — Free-write summary with AI feedback and encouragement
- **Points & Progress** — Points awarded per activity; session history tracked with scores, duration, and timestamps
- **Badges** — Six achievement badges earned automatically based on activity milestones (First Read, Perfect Score, On Fire, Word Wizard, Young Author, Centurion)

### Teacher Features

- **Class Dashboard** — Overview of class average score, students active today, and recent activity feed
- **Student Management** — Browse enrolled students, view individual progress (scores, sessions, skill breakdowns, badges), and identify students needing attention (low scores or 5+ days inactive)
- **Leaderboard** — Points-based ranking with medal icons
- **Custom Passages** — Create passages manually or generate them via AI from a topic prompt; saved per-teacher account
- **Class Code** — Auto-generated class code (e.g. `CLSAB12`) shared with students to enroll

## Project Structure

```
src/app/
├── components/
│   ├── nav/               # Shared nav bar
│   └── settings-panel/    # AI provider settings UI
├── guards/auth-guard.ts   # Role-based route protection
├── pages/
│   ├── login/             # Login / register / demo login
│   ├── student/           # Student dashboard
│   └── teacher/           # Teacher dashboard
└── services/
    ├── ai-settings.service.ts  # AI provider config (persisted to localStorage)
    ├── api.ts                  # AI integration (passage gen, grading, feedback)
    ├── auth.ts                 # Login, register, logout, demo login
    └── storage.ts              # localStorage wrapper, session saving, badge logic
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- An API key for your chosen AI provider (see [AI Provider Setup](#ai-provider-setup) below)

### Install & Run

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200/`.

### Demo Login

On the login page, use the **"Demo Student"** or **"Demo Teacher"** buttons to auto-create and log in demo accounts without registration.

## AI Provider Setup

AI provider settings are configured in-app via the **Settings panel** (gear icon in the nav bar). Settings are saved to `localStorage` — no code changes needed.

| Provider | Model used | Required fields |
|---|---|---|
| **Claude** (default) | `claude-sonnet-4-20250514` | API Key |
| **OpenAI** | `gpt-4o` | API Key |
| **Gemini** | `gemini-2.0-flash` | API Key |
| **Azure OpenAI** | your deployment | API Key + Endpoint URL |
| **DeepSeek** | `deepseek-chat` | API Key |
| **Local (Ollama)** | configurable (default: `llama3.2`) | Endpoint URL (default: `http://localhost:11434/api/generate`) |

> **Note:** API keys are stored in `localStorage` and sent directly from the browser. This is convenient for local use but not recommended for production deployments. Consider a thin server-side proxy to keep keys server-side.

## Scripts

| Command | Description |
|---|---|
| `ng serve` | Start dev server at `http://localhost:4200` |
| `ng build` | Production build to `dist/` |
| `ng test` | Run unit tests with Vitest |
| `ng build --watch --configuration development` | Watch mode build |

## Tech Stack

- **Angular 21.2** (NgModule-based)
- **TypeScript 5.9**
- **RxJS 7.8**
- **Vitest** (via Angular CLI test runner)
- **Prettier** for code formatting
- **Multi-provider AI** — Claude, OpenAI, Gemini, Azure OpenAI, DeepSeek, or local Ollama
