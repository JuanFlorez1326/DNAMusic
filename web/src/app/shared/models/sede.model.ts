export interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  activa: boolean;
  _count?: { estudiantes: number };
  createdAt?: string;
}

export interface CreateSedeDto {
  nombre: string;
  ciudad: string;
  direccion: string;
  activa?: boolean;
}
