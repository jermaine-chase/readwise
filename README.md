# Readwise

An AI-powered reading comprehension practice app for K–8 students, built with Angular 21 and the Claude API.

## Overview

Readwise supports two roles — **students** and **teachers** — with role-based dashboards and an auth guard protecting each route. All data is persisted in `localStorage` (no backend required). AI features are powered by the Anthropic Claude API called directly from the browser.

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
├── components/nav/        # Shared nav bar
├── guards/auth-guard.ts   # Role-based route protection
├── pages/
│   ├── login/             # Login / register / demo login
│   ├── student/           # Student dashboard
│   └── teacher/           # Teacher dashboard
└── services/
    ├── api.ts             # Claude API integration (passage gen, grading, feedback)
    ├── auth.ts            # Login, register, logout, demo login
    └── storage.ts         # localStorage wrapper, session saving, badge logic
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- An [Anthropic API key](https://console.anthropic.com/)

### Install & Run

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200/`.

### API Key

The app calls the Claude API directly from the browser. You will need to supply your Anthropic API key via the request headers. Locate the `callClaude` method in [src/app/services/api.ts](src/app/services/api.ts) and add your key to the `x-api-key` header — or proxy requests through a backend to keep the key server-side.

> **Note:** Exposing API keys in the browser is not recommended for production. Consider a thin server-side proxy for deployed environments.

### Demo Login

On the login page, use the **"Demo Student"** or **"Demo Teacher"** buttons to auto-create and log in demo accounts without registration.

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
- **Claude API** (`claude-sonnet-4-20250514`) for passage generation, short-answer grading, and summary feedback
