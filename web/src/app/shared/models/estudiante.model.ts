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

export interface CreateEstudianteDto {
  nombreCompleto: string;
  email: string;
  telefono: string;
  documento: string;
  sedeId: string;
  programa: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'RETIRADO';
}
