import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Nav } from './components/nav/nav';
import { Login } from './pages/login/login';
import { Student } from './pages/student/student';
import { Teacher } from './pages/teacher/teacher';

@NgModule({
  declarations: [App, Nav, Login, Student, Teacher],
  imports: [BrowserModule, AppRoutingModule, FormsModule, HttpClientModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
