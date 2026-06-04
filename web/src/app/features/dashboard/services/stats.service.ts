import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Sede } from '../../../shared/models/sede.model';

export interface Stats {
  totalPorSede: { sede: Sede; total: number }[];
  totalPorEstado: { estado: string; total: number }[];
  sedeConMasActivos: { sede: Sede; totalActivos: number } | null;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly url = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<Stats>(this.url);
  }
}
