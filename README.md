# LearnWise

An AI-powered reading and math practice app for K–8 students, built with Angular 21. Installable as a PWA for offline use.

## Overview

LearnWise supports two roles — **students** and **teachers/parents** — with role-based dashboards and an auth guard protecting each route. Data is stored locally via **PouchDB** (IndexedDB) and can optionally sync to a **CouchDB** server for multi-device persistence. AI features are powered by a configurable AI provider (Claude, OpenAI, Gemini, Azure OpenAI, DeepSeek, or a local Ollama model) called directly from the browser.

Students must provide a teacher/parent code when registering — this links them to the correct class automatically.

---

## Features

### Student

#### Reading

- **AI-Generated Passages** — Reading passages at two difficulty levels:
  - Elementary (Grade 3–5, ~110–250 words)
  - Middle School (Grade 6–8, ~190–250 words)
  - Randomized topics: animals, space, history, Minecraft, Pokémon, and more
- **Three Practice Modes:**
  - **Q&A** — Multiple choice, true/false, short answer (AI-graded), and fill-in-the-blank with fuzzy matching
  - **Vocabulary** — Flashcard-style word definitions with example sentences
  - **Summary** — Free-write summary with AI feedback and encouragement

#### Math

- **AI-Generated Problem Sets** — 6 problems per session (4 multiple choice + 2 short answer) at three grade bands:
  - K–2 (Ages 5–8): counting, addition/subtraction, shapes, measurement, patterns
  - Grade 3–5 (Ages 8–11): multiplication, division, fractions, decimals, geometry, word problems
  - Grade 6–8 (Ages 11–14): ratios, percentages, integers, algebra, geometry, statistics
- **Topic Selection** — Choose a specific topic per grade band or roll a random one
- **AI-Graded Short Answers** — Accepts equivalent forms (e.g. `0.5` and `1/2`), with step-by-step explanations shown after each answer

#### Progress & Gamification

- **Points & Progress** — Points awarded per activity; full session history with scores, duration, and timestamps; skill breakdown tracks reading Q&A, vocabulary, summarization, and math separately
- **Badges** — Six achievement badges earned automatically: First Read, Perfect Score, On Fire, Word Wizard, Young Author, Centurion

### Teacher / Parent

- **Class Code** — Auto-generated code (e.g. `CLSAB12`) shared with students at registration
- **Class Dashboard** — Class average score, students active today, recent activity feed, and per-skill performance breakdown
- **Student Management** — Browse enrolled students; drill into individual progress (sessions, scores, skill breakdown, badges); flag students needing attention (low avg score or 5+ days inactive)
- **Leaderboard** — Points-based ranking with medal icons
- **Custom Passages** — Write passages manually or generate them via AI from a topic prompt. Generated passages include a full set of questions and vocabulary — all editable before saving:
  - Edit title, level, topic, and passage text
  - Edit each question (MC options & answer, True/False, short answer sample + keywords, fill-in-the-blank)
  - Edit vocabulary words, definitions, and example sentences

---

## Project Structure

```
src/app/
├── components/
│   ├── nav/                    # Shared nav bar
│   └── settings-panel/         # AI provider + CouchDB sync settings UI
├── guards/auth-guard.ts        # Role-based route protection
├── pages/
│   ├── login/                  # Landing, login, register, demo login
│   ├── student/                # Student practice dashboard (reading + math)
│   └── teacher/                # Teacher/parent portal
└── services/
    ├── ai-settings.service.ts  # AI provider config (persisted to localStorage)
    ├── api.ts                  # AI integration: passage/math generation, grading, feedback
    ├── auth.ts                 # Login, register, logout, demo login
    ├── db.service.ts           # PouchDB wrapper + live CouchDB sync
    └── storage.ts              # Data access layer (reads/writes via PouchDB + localStorage)

public/
├── sw.js                       # Custom service worker (offline support)
├── manifest.webmanifest        # PWA install manifest
└── icons/                      # SVG app icons (any size + maskable)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- An API key for your chosen AI provider (see [AI Provider Setup](#ai-provider-setup))

### Install & Run

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200`.

### Demo Login

On the login page, use **Try as Student Demo** or **Try as Teacher/Parent Demo** to auto-create and sign in demo accounts without registration.

---

## AI Provider Setup

AI provider settings are configured in-app via the **Settings panel** (accessible from the sidebar). Settings are saved to `localStorage` — no code changes needed.

| Provider | Model | Required |
|---|---|---|
| **Claude** (default) | `claude-sonnet-4-20250514` | API Key |
| **OpenAI** | `gpt-4o` | API Key |
| **Gemini** | `gemini-2.0-flash` | API Key |
| **Azure OpenAI** | your deployment | API Key + Endpoint URL |
| **DeepSeek** | `deepseek-chat` | API Key |
| **Local (Ollama)** | configurable (default: `llama3.2`) | Endpoint URL |

> **Security note:** API keys are stored in `localStorage` and sent directly from the browser. Fine for local/personal use; for a shared deployment consider routing AI calls through a server-side proxy to keep keys out of the client.

---

## Data Storage & Sync

### PouchDB (local, always-on)

All user data is stored in **PouchDB** (backed by IndexedDB) so the app works fully offline. On first launch, any existing `localStorage` data is migrated automatically.

### CouchDB sync (optional)

Configure a CouchDB server URL in **Settings → Data Sync** to enable live bidirectional sync. Changes made on any device propagate automatically whenever the device is online. Credentials are stored only in browser `localStorage` and sent directly to your CouchDB server.

Self-hosting options:
- **CouchDB** — `docker run -p 5984:5984 couchdb`
- **Cloudant** — managed CouchDB-compatible service (IBM)
- **DigitalOcean** / any VPS running CouchDB

> Create a database named `learnwise` on your server, enable CORS for your app's origin, and paste the URL (including the database name) into the sync settings.

---

## PWA / Offline Support

LearnWise is installable as a Progressive Web App on desktop and mobile. After the first load, the app shell (HTML, JS, CSS, icons) is served from the service worker cache so the app opens offline. AI features (passage/problem generation, grading) still require a network connection.

The service worker (`public/sw.js`) uses:
- **Navigation requests** — network-first, falls back to cached `index.html` for SPA routing
- **Same-origin assets** — cache-first with background refresh (stale-while-revalidate)
- **External AI API calls** — always bypassed (never cached)
- **CouchDB/PouchDB sync endpoints** — always bypassed (never cached)

> **Icon note:** Icons use SVG format (`sizes: "any"`), which is supported by Chrome, Edge, and Firefox. For broader compatibility (older Android, iOS Add to Home Screen thumbnails) replace `/public/icons/icon.svg` with PNG exports at 192×192 and 512×512.

---

## Scripts

| Command | Description |
|---|---|
| `ng serve` | Dev server at `http://localhost:4200` |
| `ng build` | Production build to `dist/` |
| `ng build --watch --configuration development` | Watch mode build |
| `ng test` | Run unit tests |

---

## Tech Stack

- **Angular 21.2** — NgModule-based
- **TypeScript 5.9**
- **RxJS 7.8**
- **PouchDB** — offline-first local database (IndexedDB)
- **CouchDB** — optional server-side sync target
- **Prettier** — code formatting
- **Custom service worker** — PWA / offline support
- **Multi-provider AI** — Claude, OpenAI, Gemini, Azure OpenAI, DeepSeek, Ollama
