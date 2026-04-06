import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

type View = 'landing' | 'login' | 'register';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  view: View = 'landing';
  role: 'student' | 'teacher' = 'student';

  loginEmail = ''; loginPassword = ''; loginErr = '';
  regName = ''; regEmail = ''; regPassword = ''; regClassCode = ''; regErr = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (user) this.router.navigate([user.role === 'teacher' ? '/teacher' : '/student']);
  }

  show(v: View) { this.view = v; this.loginErr = ''; this.regErr = ''; }

  doLogin() {
    this.loginErr = '';
    if (!this.loginEmail || !this.loginPassword) { this.loginErr = 'Please fill in all fields.'; return; }
    const res = this.auth.login(this.loginEmail, this.loginPassword);
    if (res.err) { this.loginErr = res.err; return; }
    this.router.navigate([res.user?.role === 'teacher' ? '/teacher' : '/student']);
  }

  doRegister() {
    this.regErr = '';
    if (!this.regName || !this.regEmail || !this.regPassword) { this.regErr = 'Please fill in all fields.'; return; }
    if (this.regPassword.length < 6) { this.regErr = 'Password must be at least 6 characters.'; return; }
    if (this.role === 'student' && !this.regClassCode.trim()) { this.regErr = 'A teacher/parent code is required to register as a student.'; return; }
    const res = this.auth.register(this.regName, this.regEmail, this.regPassword, this.role, this.regClassCode.toUpperCase() || undefined);
    if (res.err) { this.regErr = res.err; return; }
    this.router.navigate([res.user?.role === 'teacher' ? '/teacher' : '/student']);
  }

  demoLogin(role: 'student' | 'teacher') { this.auth.demoLogin(role); }
}
