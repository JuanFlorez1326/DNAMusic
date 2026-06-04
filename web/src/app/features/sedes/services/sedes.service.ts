import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Sede, CreateSedeDto } from '../../../shared/models/sede.model';

@Injectable({ providedIn: 'root' })
export class SedesService {
  private readonly url = `${environment.apiUrl}/sedes`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Sede[]>(this.url);
  }

  getById(id: string) {
    return this.http.get<Sede>(`${this.url}/${id}`);
  }

  create(data: CreateSedeDto) {
    return this.http.post<Sede>(this.url, data);
  }

  update(id: string, data: Partial<CreateSedeDto>) {
    return this.http.put<Sede>(`${this.url}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
