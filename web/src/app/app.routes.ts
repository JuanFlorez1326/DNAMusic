import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'estudiantes', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'estudiantes',
    loadComponent: () => import('./features/estudiantes/estudiantes').then((m) => m.EstudiantesPage),
    canActivate: [authGuard],
  },
  {
    path: 'sedes',
    loadComponent: () => import('./features/sedes/sedes').then((m) => m.SedesPage),
    canActivate: [authGuard],
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.UsuariosPage),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'estudiantes' },
];
