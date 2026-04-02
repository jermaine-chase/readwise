import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth';
import { User } from '../../services/storage';
import { filter } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-nav',
  templateUrl: './nav.html',
  styleUrl: './nav.css'
})
export class Nav implements OnInit {
  user: User | null = null;
  currentUrl = '';

  constructor(public auth: AuthService, public router: Router) {}

  ngOnInit() {
    this.user = this.auth.getCurrentUser();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentUrl = e.url;
      this.user = this.auth.getCurrentUser();
    });
  }

  get isStudent() { return this.user?.role === 'student'; }
  get isTeacher() { return this.user?.role === 'teacher'; }
  get showNav() { return !!this.user; }
  navigate(path: string) { this.router.navigate([path]); }
}
