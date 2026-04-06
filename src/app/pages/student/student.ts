import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth';
import { StorageService, User, Badge } from '../../services/storage';
import { ApiService, Passage, MathProblem } from '../../services/api';

type Subject = 'reading' | 'math';
type Mode = 'qa' | 'vocab' | 'summary';
type Page = 'practice' | 'progress' | 'badges' | 'settings';
interface AnswerState { result: 'correct' | 'wrong' | 'answered' | null; feedback?: string; loading?: boolean; }

@Component({
  standalone: false,
  selector: 'app-student',
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class Student implements OnInit {
  user!: User;
  subject: Subject = 'reading';
  mode: Mode = 'qa';
  page: Page = 'practice';
  level = 'elementary';

  passage: Passage | null = null;
  passageLoading = false;

  // Math
  mathGrade = 'elementary';
  mathTopic = 'random';
  mathProblems: MathProblem | null = null;
  mathLoading = false;
  mathAnswers: Record<number, AnswerState> = {};
  selectedMathMC: Record<number, string> = {};
  mathLocked = false;
  mathShowScore = false;

  readonly mathTopics: Record<string, string[]> = {
    k2: ['Counting & Numbers', 'Addition & Subtraction', 'Shapes', 'Measurement', 'Patterns'],
    elementary: ['Multiplication & Division', 'Fractions', 'Decimals', 'Geometry', 'Word Problems', 'Place Value'],
    middle: ['Ratios & Proportions', 'Percentages', 'Integers', 'Algebra', 'Geometry', 'Statistics & Data'],
  };

  get mathTopicOptions() { return this.mathTopics[this.mathGrade] ?? []; }
  get mathCorrectCount() { return Object.values(this.mathAnswers).filter(a => a.result === 'correct').length; }
  get mathScorePct() { return this.mathProblems ? Math.round(this.mathCorrectCount / this.mathProblems.problems.length * 100) : 0; }
  get mathScoreEmoji() { return this.mathScorePct >= 90 ? '🏆' : this.mathScorePct >= 75 ? '🌟' : this.mathScorePct >= 60 ? '👍' : '💪'; }
  get mathScoreMsg() { return this.mathScorePct >= 90 ? 'Outstanding!' : this.mathScorePct >= 75 ? 'Great job!' : this.mathScorePct >= 60 ? 'Good effort!' : 'Keep practicing!'; }

  answers: Record<number, AnswerState> = {};
  selectedMC: Record<number, string> = {};
  qaLocked = false;
  showScore = false;

  vocabFlipped: boolean[] = [];

  summaryText = '';
  summaryLoading = false;
  summaryFeedback = '';
  summaryFeedbackClass = '';

  badgeToast: Badge | null = null;

  get sessions() { return this.user?.sessions ?? []; }
  get qaSessions() { return this.sessions.filter(s => s.type === 'qa'); }
  get avgScore() { return this.qaSessions.length ? Math.round(this.qaSessions.reduce((a, s) => a + (s.score ?? 0), 0) / this.qaSessions.length) : 0; }
  get totalTimeMin() { return Math.round(this.sessions.reduce((a, s) => a + (s.duration ?? 0), 0) / 60000); }
  get correctCount() { return Object.values(this.answers).filter(a => a.result === 'correct').length; }
  get scorePct() { return this.passage ? Math.round(this.correctCount / this.passage.questions.length * 100) : 0; }
  get scoreEmoji() { return this.scorePct >= 90 ? '🏆' : this.scorePct >= 75 ? '🌟' : this.scorePct >= 60 ? '👍' : '💪'; }
  get scoreMsg() { return this.scorePct >= 90 ? 'Outstanding!' : this.scorePct >= 75 ? 'Great job!' : this.scorePct >= 60 ? 'Good effort!' : 'Keep practicing!'; }

  constructor(private auth: AuthService, private storage: StorageService, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.user = this.auth.getCurrentUser()!;
    if (!this.user) this.auth.logout();
  }

  greeting(): string {
    const h = new Date().getHours();
    return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', ' + this.user.name.split(' ')[0] + '! 👋';
  }

  showPage(p: Page) { this.page = p; }

  async loadPassage() {
    this.passageLoading = true;
    this.passage = null;
    this.answers = {}; this.selectedMC = {}; this.qaLocked = false; this.showScore = false;
    this.summaryText = ''; this.summaryFeedback = '';
    this.vocabFlipped = [];
    try {
      this.passage = await this.api.loadPassage(this.level);
      this.vocabFlipped = new Array(this.passage.vocabulary.length).fill(false);
    } catch (e) { console.error(e); }
    this.passageLoading = false;
    this.cdr.detectChanges();
  }

  answerMC(qi: number, letter: string) {
    if (this.answers[qi]) return;
    const correct = this.passage!.questions[qi].answer!;
    this.answers[qi] = { result: letter === correct ? 'correct' : 'wrong' };
    this.addPoints(letter === correct ? 10 : 2);
    this.checkAllAnswered();
  }

  answerTF(qi: number, val: string) {
    if (this.answers[qi]) return;
    const correct = this.passage!.questions[qi].answer!;
    this.answers[qi] = { result: val === correct ? 'correct' : 'wrong' };
    this.addPoints(val === correct ? 8 : 2);
    this.checkAllAnswered();
  }

  async checkShort(qi: number, inputEl: HTMLInputElement) {
    const val = inputEl.value.trim();
    if (!val || this.answers[qi]) return;
    this.answers[qi] = { result: 'answered', loading: true };
    const q = this.passage!.questions[qi];
    try {
      const res = await this.api.checkShortAnswer(this.passage!.text, q.q, q.sampleAnswer!, q.keywords!, val);
      const r: 'correct'|'answered'|'wrong' = res.score === 'correct' ? 'correct' : res.score === 'partial' ? 'answered' : 'wrong';
      this.answers[qi] = { result: r, feedback: res.feedback, loading: false };
      this.addPoints(r === 'correct' ? 12 : r === 'answered' ? 5 : 1);
    } catch { this.answers[qi] = { result: null }; }
    this.checkAllAnswered();
  }

  checkFill(qi: number, inputEl: HTMLInputElement) {
    const val = inputEl.value.trim();
    if (!val || this.answers[qi]) return;
    const correct = this.passage!.questions[qi].answer!.toLowerCase();
    const ok = val.toLowerCase().includes(correct) || correct.includes(val.toLowerCase()) || this.levenshtein(correct, val.toLowerCase()) <= 2;
    this.answers[qi] = { result: ok ? 'correct' : 'wrong', feedback: ok ? `✅ Correct! The answer is: ${this.passage!.questions[qi].answer}` : `❌ Not quite. The answer was: ${this.passage!.questions[qi].answer}` };
    this.addPoints(ok ? 8 : 1);
    this.checkAllAnswered();
  }

  levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i||j));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++) dp[i][j] = a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    return dp[m][n];
  }

  dotClass(qi: number): string {
    const a = this.answers[qi];
    if (!a) return '';
    return a.result === 'correct' ? 'correct' : a.result === 'wrong' ? 'wrong' : 'answered';
  }

  checkAllAnswered() {
    if (!this.passage || this.showScore) return;
    const loading = Object.values(this.answers).some(a => a.loading);
    if (!loading && Object.keys(this.answers).length >= this.passage.questions.length) this.finalizeScore();
  }

  finalizeScore() {
    this.qaLocked = true; this.showScore = true;
    this.storage.saveSession(this.user.id, { type:'qa', title:this.passage!.title, score:this.scorePct, correct:this.correctCount, total:this.passage!.questions.length, points:this.correctCount*10, duration:0, ts:Date.now() });
    this.refreshUser(); this.triggerBadgeCheck();
  }

  flipVocab(i: number) {
    if (!this.vocabFlipped[i]) {
      this.vocabFlipped[i] = true;
      this.addPoints(2);
      this.storage.saveSession(this.user.id, { type:'vocab', title:this.passage?.title??'', points:2, duration:0, ts:Date.now() });
      this.refreshUser(); this.triggerBadgeCheck();
    }
  }

  async checkSummary() {
    if (!this.summaryText.trim() || !this.passage) return;
    this.summaryLoading = true; this.summaryFeedback = '';
    try {
      const resp = await this.api.checkSummary(this.passage.text, this.passage.title, this.summaryText, this.level);
      this.summaryFeedback = resp;
      this.summaryFeedbackClass = resp.startsWith('🌟') ? 'good' : resp.startsWith('👍') ? 'ai' : 'needs';
      const pts = resp.startsWith('🌟') ? 15 : resp.startsWith('👍') ? 10 : 5;
      this.addPoints(pts);
      this.storage.saveSession(this.user.id, { type:'summary', title:this.passage.title, points:pts, duration:0, ts:Date.now() });
      this.refreshUser(); this.triggerBadgeCheck();
    } catch { this.summaryFeedback = 'Could not get feedback right now. Try again!'; this.summaryFeedbackClass = 'needs'; }
    this.summaryLoading = false;
  }

  addPoints(n: number) {
    const users = this.storage.getUsers();
    if (users[this.user.id]) { users[this.user.id].points = (users[this.user.id].points??0) + n; this.storage.saveUsers(users); this.storage.setCurrentUser(users[this.user.id]); }
    this.refreshUser();
  }

  refreshUser() { const u = this.storage.getCurrentUser(); if (u) this.user = u; }

  triggerBadgeCheck() {
    const nb = this.storage.checkBadges(this.user);
    nb.forEach((b,i) => setTimeout(() => { this.badgeToast=b; setTimeout(()=>this.badgeToast=null,3500); }, i*4000));
    this.refreshUser();
  }

  skillPct(type: string): number {
    if (type==='qa') return this.avgScore;
    if (type==='math') {
      const mathSessions = this.sessions.filter(s => s.type === 'math');
      return mathSessions.length ? Math.round(mathSessions.reduce((a, s) => a + (s.score ?? 0), 0) / mathSessions.length) : 0;
    }
    const count = this.sessions.filter(s=>s.type===type).length;
    return type==='vocab' ? Math.min(count*20,100) : Math.min(count*33,100);
  }

  switchSubject(s: Subject) {
    this.subject = s;
    if (s === 'math') { this.mathProblems = null; this.mathAnswers = {}; this.selectedMathMC = {}; this.mathLocked = false; this.mathShowScore = false; }
    if (s === 'reading') { this.passage = null; this.answers = {}; this.selectedMC = {}; this.qaLocked = false; this.showScore = false; }
  }

  onMathGradeChange() { this.mathTopic = 'random'; this.mathProblems = null; }

  async loadMathProblems() {
    this.mathLoading = true;
    this.mathProblems = null;
    this.mathAnswers = {}; this.selectedMathMC = {}; this.mathLocked = false; this.mathShowScore = false;
    try {
      this.mathProblems = await this.api.loadMathProblems(this.mathGrade, this.mathTopic);
    } catch (e) { console.error(e); }
    this.mathLoading = false;
    this.cdr.detectChanges();
  }

  answerMathMC(pi: number, letter: string) {
    if (this.mathAnswers[pi]) return;
    const correct = this.mathProblems!.problems[pi].answer;
    this.mathAnswers[pi] = { result: letter === correct ? 'correct' : 'wrong' };
    this.addPoints(letter === correct ? 10 : 2);
    this.checkAllMathAnswered();
  }

  async checkMathShort(pi: number, inputEl: HTMLInputElement) {
    const val = inputEl.value.trim();
    if (!val || this.mathAnswers[pi]) return;
    this.mathAnswers[pi] = { result: 'answered', loading: true };
    const p = this.mathProblems!.problems[pi];
    try {
      const res = await this.api.checkMathShortAnswer(p.q, p.answer, val);
      const r: 'correct'|'answered'|'wrong' = res.score === 'correct' ? 'correct' : res.score === 'partial' ? 'answered' : 'wrong';
      this.mathAnswers[pi] = { result: r, feedback: res.feedback, loading: false };
      this.addPoints(r === 'correct' ? 12 : r === 'answered' ? 5 : 1);
    } catch { this.mathAnswers[pi] = { result: null }; }
    this.checkAllMathAnswered();
    this.cdr.detectChanges();
  }

  mathDotClass(pi: number): string {
    const a = this.mathAnswers[pi];
    if (!a) return '';
    return a.result === 'correct' ? 'correct' : a.result === 'wrong' ? 'wrong' : 'answered';
  }

  checkAllMathAnswered() {
    if (!this.mathProblems || this.mathShowScore) return;
    const loading = Object.values(this.mathAnswers).some(a => a.loading);
    if (!loading && Object.keys(this.mathAnswers).length >= this.mathProblems.problems.length) this.finalizeMathScore();
  }

  finalizeMathScore() {
    this.mathLocked = true; this.mathShowScore = true;
    this.storage.saveSession(this.user.id, { type:'math', title: (this.mathProblems!.topic || 'Math') + ' (' + this.mathProblems!.grade + ')', score: this.mathScorePct, correct: this.mathCorrectCount, total: this.mathProblems!.problems.length, points: this.mathCorrectCount * 10, duration: 0, ts: Date.now() });
    this.refreshUser(); this.triggerBadgeCheck();
  }

  timeAgo(ts: number) { return this.storage.timeAgo(ts); }
  allBadges() { return this.storage.BADGES; }
  hasBadge(id: string) { return (this.user.badges??[]).includes(id); }
}
