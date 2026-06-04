import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Estudiante, CreateEstudianteDto } from '../../../shared/models/estudiante.model';
import { PaginatedResponse } from '../../../shared/models/pagination.model';

export interface EstudiantesFilter {
  sedeId?: string;
  estado?: string;
  search?: string;
  page?: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class EstudiantesService {
  private readonly url = `${environment.apiUrl}/estudiantes`;

  constructor(private http: HttpClient) {}

  getAll(filters: EstudiantesFilter = {}) {
    let params = new HttpParams();
    if (filters.sedeId) params = params.set('sedeId', filters.sedeId);
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.page) params = params.set('page', filters.page.toString());
    return this.http.get<PaginatedResponse<Estudiante>>(this.url, { params });
  }

  create(data: CreateEstudianteDto) {
    return this.http.post<Estudiante>(this.url, data);
  }

  update(id: string, data: Partial<CreateEstudianteDto>) {
    return this.http.put<Estudiante>(`${this.url}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  importFromExternal(sedeId: string, limit = 5) {
    return this.http.post<ImportResult>(`${environment.apiUrl}/external/import`, { sedeId, limit });
  }
}
