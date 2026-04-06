import { Injectable } from '@angular/core';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher';
  points: number;
  lastActive: number | null;
  createdAt: number;
  // student
  classCode?: string;
  sessions?: Session[];
  badges?: string[];
  totalTime?: number;
  // teacher
  customPassages?: CustomPassage[];
}

export interface Session {
  type: 'qa' | 'vocab' | 'summary';
  title: string;
  score?: number;
  correct?: number;
  total?: number;
  points: number;
  duration: number;
  ts: number;
}

export interface CustomPassage {
  id: string;
  title: string;
  text: string;
  level: string;
  topic: string;
  createdAt: number;
  questions?: any[];
  vocabulary?: any[];
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private prefix = 'rw_';

  set(key: string, val: any): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(val));
  }

  get<T>(key: string, def: T): T {
    try {
      const v = localStorage.getItem(this.prefix + key);
      return v ? JSON.parse(v) : def;
    } catch { return def; }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  getUsers(): Record<string, User> {
    return this.get('users', {});
  }

  saveUsers(users: Record<string, User>): void {
    this.set('users', users);
  }

  getCurrentUser(): User | null {
    return this.get<User | null>('currentUser', null);
  }

  setCurrentUser(u: User): void {
    this.set('currentUser', u);
  }

  updateUser(id: string, data: Partial<User>): User | null {
    const users = this.getUsers();
    if (!users[id]) return null;
    users[id] = { ...users[id], ...data };
    this.saveUsers(users);
    const cur = this.getCurrentUser();
    if (cur && cur.id === id) this.setCurrentUser(users[id]);
    return users[id];
  }

  saveSession(userId: string, session: Session): void {
    const users = this.getUsers();
    if (!users[userId]) return;
    users[userId].sessions = users[userId].sessions ?? [];
    users[userId].sessions!.push(session);
    users[userId].points = (users[userId].points ?? 0) + (session.points ?? 0);
    users[userId].totalTime = (users[userId].totalTime ?? 0) + (session.duration ?? 0);
    this.saveUsers(users);
    this.setCurrentUser(users[userId]);
  }

  getStudentsInClass(classCode: string): User[] {
    return Object.values(this.getUsers()).filter(
      u => u.role === 'student' && u.classCode === classCode
    );
  }

  timeAgo(ts: number | null): string {
    if (!ts) return 'Never';
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'Just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }

  readonly BADGES: Badge[] = [
    { id: 'first',    icon: '🎯', name: 'First Read',    desc: 'Completed your first passage' },
    { id: 'perfect',  icon: '⭐', name: 'Perfect Score',  desc: 'Got 100% on a Q&A session' },
    { id: 'streak5',  icon: '🔥', name: 'On Fire',        desc: 'Earned 50+ points total' },
    { id: 'vocab10',  icon: '📚', name: 'Word Wizard',    desc: 'Completed 3 vocab sessions' },
    { id: 'writer',   icon: '✍️', name: 'Young Author',   desc: 'Submitted 3 summaries' },
    { id: 'centurion',icon: '💯', name: 'Centurion',      desc: 'Earned 100 points total' },
  ];

  checkBadges(user: User): Badge[] {
    const earned = user.badges ?? [];
    const checks: Record<string, (u: User) => boolean> = {
      first:    u => (u.sessions?.length ?? 0) >= 1,
      perfect:  u => (u.sessions ?? []).some(s => s.type === 'qa' && s.score === 100),
      streak5:  u => (u.points ?? 0) >= 50,
      vocab10:  u => (u.sessions ?? []).filter(s => s.type === 'vocab').length >= 3,
      writer:   u => (u.sessions ?? []).filter(s => s.type === 'summary').length >= 3,
      centurion:u => (u.points ?? 0) >= 100,
    };
    const newBadges: Badge[] = [];
    for (const b of this.BADGES) {
      if (!earned.includes(b.id) && checks[b.id]?.(user)) {
        earned.push(b.id);
        newBadges.push(b);
      }
    }
    if (newBadges.length) this.updateUser(user.id, { badges: earned });
    return newBadges;
  }

  getCustomPassages(teacherId: string): CustomPassage[] {
    const users = this.getUsers();
    return (users[teacherId]?.customPassages) ?? [];
  }

  saveCustomPassage(teacherId: string, passage: Omit<CustomPassage, 'id'>): void {
    const users = this.getUsers();
    if (!users[teacherId]) return;
    users[teacherId].customPassages = users[teacherId].customPassages ?? [];
    users[teacherId].customPassages!.push({ ...passage, id: 'p_' + Date.now() });
    this.saveUsers(users);
  }
}
