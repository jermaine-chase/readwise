import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService, User } from './storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private storage: StorageService, private router: Router) {}

  getCurrentUser(): User | null {
    return this.storage.getCurrentUser();
  }

  register(name: string, email: string, password: string, role: 'student' | 'teacher', classCode?: string): { user?: User; err?: string } {
    const users = this.storage.getUsers();
    if (Object.values(users).find(u => u.email === email)) return { err: 'Email already exists' };
    const id = 'u_' + Date.now();
    const user: User = {
      id, name, email, password, role,
      points: 0, lastActive: null, createdAt: Date.now(),
    };
    if (role === 'student') {
      user.classCode = classCode ?? undefined;
      user.sessions = []; user.badges = []; user.totalTime = 0;
    }
    if (role === 'teacher') {
      user.classCode = 'CLS' + Math.random().toString(36).slice(2, 6).toUpperCase();
      user.customPassages = [];
    }
    users[id] = user;
    this.storage.saveUsers(users);
    this.storage.setCurrentUser(user);
    return { user };
  }

  login(email: string, password: string): { user?: User; err?: string } {
    const users = this.storage.getUsers();
    const user = Object.values(users).find(u => u.email === email && u.password === password);
    if (!user) return { err: 'Invalid email or password' };
    user.lastActive = Date.now();
    users[user.id] = user;
    this.storage.saveUsers(users);
    this.storage.setCurrentUser(user);
    return { user };
  }

  logout(): void {
    this.storage.remove('currentUser');
    this.router.navigate(['']);
  }

  getUserByEmail(email: string): import('./storage').User | null {
    const users = this.storage.getUsers();
    return Object.values(users).find(u => u.email === email) ?? null;
  }

  resetPassword(email: string, newPassword: string): boolean {
    const users = this.storage.getUsers();
    const user = Object.values(users).find(u => u.email === email);
    if (!user) return false;
    user.password = newPassword;
    users[user.id] = user;
    this.storage.saveUsers(users);
    return true;
  }

  demoLogin(role: 'student' | 'teacher'): void {
    const email = role + '@demo.learnwise.app';
    const password = 'demo1234';
    let res = this.login(email, password);
    if (res.err) {
      res = this.register(role === 'teacher' ? 'Ms. Demo Teacher' : 'Demo Student', email, password, role);
    }
    if (res.user) this.router.navigate([role === 'teacher' ? '/teacher' : '/student']);
  }
}
