import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getCurrentUser();
  if (!user) { router.navigate(['']); return false; }
  const requiredRole = route.data?.['role'];
  if (requiredRole && user.role !== requiredRole) {
    router.navigate([user.role === 'teacher' ? '/teacher' : '/student']);
    return false;
  }
  return true;
};
