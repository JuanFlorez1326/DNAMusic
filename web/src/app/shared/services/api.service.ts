import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  activa: boolean;
  _count?: { estudiantes: number };
}

export interface Estudiante {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  documento: string;
  sedeId: string;
  sede?: { id: string; nombre: string; ciudad: string };
  programa: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'RETIRADO';
  fechaInscripcion: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface Stats {
  totalPorSede: { sede: Sede; total: number }[];
  totalPorEstado: { estado: string; total: number }[];
  sedeConMasActivos: { sede: Sede; totalActivos: number } | null;
}

export interface CreateEstudianteDto {
  nombreCompleto: string;
  email: string;
  telefono: string;
  documento: string;
  sedeId: string;
  programa: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'RETIRADO';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSedes() {
    return this.http.get<Sede[]>(`${this.base}/sedes`);
  }

  getEstudiantes(filters: { sedeId?: string; estado?: string; search?: string; page?: number }) {
    let params = new HttpParams();
    if (filters.sedeId) params = params.set('sedeId', filters.sedeId);
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.page) params = params.set('page', filters.page.toString());
    return this.http.get<PaginatedResponse<Estudiante>>(`${this.base}/estudiantes`, { params });
  }

  createEstudiante(data: CreateEstudianteDto) {
    return this.http.post<Estudiante>(`${this.base}/estudiantes`, data);
  }

  updateEstudiante(id: string, data: Partial<CreateEstudianteDto>) {
    return this.http.put<Estudiante>(`${this.base}/estudiantes/${id}`, data);
  }

  deleteEstudiante(id: string) {
    return this.http.delete(`${this.base}/estudiantes/${id}`);
  }

  getStats() {
    return this.http.get<Stats>(`${this.base}/stats`);
  }
}
