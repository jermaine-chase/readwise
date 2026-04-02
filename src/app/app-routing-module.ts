import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Student } from './pages/student/student';
import { Teacher } from './pages/teacher/teacher';
import { authGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: '', component: Login },
  { path: 'student', component: Student, canActivate: [authGuard], data: { role: 'student' } },
  { path: 'teacher', component: Teacher, canActivate: [authGuard], data: { role: 'teacher' } },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
