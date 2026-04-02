import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { StorageService, User, CustomPassage } from '../../services/storage';
import { ApiService } from '../../services/api';

type Section = 'dashboard' | 'students' | 'studentDetail' | 'leaderboard' | 'passages' | 'reports';

@Component({
  standalone: false,
  selector: 'app-teacher',
  templateUrl: './teacher.html',
  styleUrl: './teacher.css'
})
export class Teacher implements OnInit {
  teacher!: User;
  section: Section = 'dashboard';

  // Student detail
  selectedStudent: User | null = null;

  // Custom passages
  cpTitle = ''; cpText = ''; cpLevel = 'elementary'; cpTopic = '';
  genTopic = ''; genLevel = 'elementary';
  genLoading = false;
  generatedPassage: any = null;

  // Toast
  toastMsg = '';
  toastTimer: any;

  constructor(private auth: AuthService, private storage: StorageService, private api: ApiService) {}

  ngOnInit() {
    this.teacher = this.auth.getCurrentUser()!;
    if (!this.teacher || this.teacher.role !== 'teacher') this.auth.logout();
  }

  greeting(): string {
    const h = new Date().getHours();
    return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', ' + this.teacher.name.split(' ')[0] + '! 👋';
  }

  showSection(s: Section) { this.section = s; }

  // ── Students ────────────────────────────────────────────────────────
  get students(): User[] {
    return this.storage.getStudentsInClass(this.teacher.classCode!).sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }

  showStudentDetail(id: string) {
    const users = this.storage.getUsers();
    this.selectedStudent = users[id] ?? null;
    this.section = 'studentDetail';
  }

  studentAvgScore(s: User): number {
    const qs = (s.sessions ?? []).filter(x => x.type === 'qa');
    return qs.length ? Math.round(qs.reduce((a, x) => a + (x.score ?? 0), 0) / qs.length) : 0;
  }

  studentSkillPct(s: User, type: string): number {
    if (type === 'qa') return this.studentAvgScore(s);
    const c = (s.sessions ?? []).filter(x => x.type === type).length;
    return type === 'vocab' ? Math.min(c * 20, 100) : Math.min(c * 33, 100);
  }

  // ── Dashboard ───────────────────────────────────────────────────────
  get allSessions() { return this.students.flatMap(s => s.sessions ?? []); }
  get classAvgScore(): number {
    const qs = this.allSessions.filter(s => s.type === 'qa');
    return qs.length ? Math.round(qs.reduce((a, s) => a + (s.score ?? 0), 0) / qs.length) : 0;
  }
  get activeToday(): number {
    return this.students.filter(s => s.lastActive && Date.now() - s.lastActive < 86400000).length;
  }
  get recentActivity() {
    return this.allSessions.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }

  classSkillPct(type: string): number {
    const sessions = this.allSessions;
    if (type === 'qa') return this.classAvgScore;
    const c = sessions.filter(s => s.type === type).length;
    return type === 'vocab' ? Math.min(c * 5, 100) : Math.min(c * 10, 100);
  }

  sessionOwner(s: any): User | undefined {
    return this.students.find(u => (u.sessions ?? []).some(x => x.ts === s.ts));
  }

  // ── Passages ────────────────────────────────────────────────────────
  get savedPassages(): CustomPassage[] {
    return this.storage.getCustomPassages(this.teacher.id);
  }

  saveCustomPassage() {
    if (!this.cpTitle.trim() || !this.cpText.trim()) { this.toast('⚠️ Please add a title and passage text.'); return; }
    this.storage.saveCustomPassage(this.teacher.id, { title: this.cpTitle, text: this.cpText, level: this.cpLevel, topic: this.cpTopic || 'General', createdAt: Date.now() });
    this.cpTitle = ''; this.cpText = ''; this.cpTopic = '';
    this.toast('✅ Passage saved!');
  }

  async generatePassage() {
    if (!this.genTopic.trim()) { this.toast('Enter a topic first!'); return; }
    this.genLoading = true;
    try {
      this.generatedPassage = await this.api.generatePassage(this.genTopic, this.genLevel);
      this.toast('✨ Passage generated!');
    } catch { this.toast('Error generating. Try again.'); }
    this.genLoading = false;
  }

  saveGenPassage() {
    if (!this.generatedPassage) return;
    this.storage.saveCustomPassage(this.teacher.id, { ...this.generatedPassage, id: '', createdAt: Date.now() });
    this.generatedPassage = null; this.genTopic = '';
    this.toast('✅ Passage saved!');
  }

  deletePassage(i: number) {
    const users = this.storage.getUsers();
    users[this.teacher.id].customPassages?.splice(i, 1);
    this.storage.saveUsers(users);
    this.toast('Passage deleted.');
  }

  // ── Reports ─────────────────────────────────────────────────────────
  get needsAttention(): User[] {
    return this.students.filter(s => {
      const qs = (s.sessions ?? []).filter(x => x.type === 'qa');
      const avg = qs.length ? qs.reduce((a, x) => a + (x.score ?? 0), 0) / qs.length : null;
      const inactive = !s.lastActive || Date.now() - s.lastActive > 5 * 86400000;
      return (avg !== null && avg < 60) || inactive;
    });
  }

  needsReason(s: User): string {
    const qs = (s.sessions ?? []).filter(x => x.type === 'qa');
    const avg = qs.length ? Math.round(qs.reduce((a, x) => a + (x.score ?? 0), 0) / qs.length) : null;
    return avg !== null && avg < 60 ? `Low avg score: ${avg}%` : `Inactive for ${this.timeAgo(s.lastActive)}`;
  }

  // ── Leaderboard ─────────────────────────────────────────────────────
  medalFor(i: number): string { return ['🥇','🥈','🥉'][i] ?? '#' + (i + 1); }
  rankClass(i: number): string { return ['gold','silver','bronze'][i] ?? ''; }

  // ── Helpers ─────────────────────────────────────────────────────────
  allBadges() { return this.storage.BADGES; }
  hasBadge(s: User, id: string) { return (s.badges ?? []).includes(id); }
  timeAgo(ts: number | null) { return this.storage.timeAgo(ts); }
  round(n: number) { return Math.round(n); }
  getInitials(name: string): string { return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(); }
  wordCount(text: string) { return text.split(' ').length; }

  copyCode() {
    navigator.clipboard.writeText(this.teacher.classCode ?? '').then(() => this.toast('✅ Class code copied!'));
  }

  toast(msg: string) {
    this.toastMsg = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg = '', 2500);
  }
}
