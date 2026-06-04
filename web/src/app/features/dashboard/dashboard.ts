import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatsService, Stats } from './services/stats.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardPage implements OnInit {
  private statsService = inject(StatsService);

  stats = signal<Stats | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    this.statsService.get().subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message ?? 'Error al cargar estadísticas'); this.loading.set(false); },
    });
  }
}
