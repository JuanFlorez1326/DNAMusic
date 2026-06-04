import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstudiantesService } from './services/estudiantes.service';
import { SedesService } from '../sedes/services/sedes.service';
import { AuthService } from '../../core/services/auth.service';
import { Estudiante, CreateEstudianteDto } from '../../shared/models/estudiante.model';
import { Sede } from '../../shared/models/sede.model';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiantes.html',
  styleUrls: ['./estudiantes.css'],
})
export class EstudiantesPage implements OnInit {
  private estudiantesService = inject(EstudiantesService);
  private sedesService = inject(SedesService);
  auth = inject(AuthService);

  estudiantes = signal<Estudiante[]>([]);
  sedes = signal<Sede[]>([]);
  loading = signal(false);
  error = signal('');
  successMsg = signal('');

  filterSedeId = signal('');
  filterEstado = signal('');
  filterSearch = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  showModal = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  formError = signal('');
  form: CreateEstudianteDto = {
    nombreCompleto: '', email: '', telefono: '', documento: '',
    sedeId: '', programa: '', estado: 'ACTIVO',
  };

  showImportModal = signal(false);
  importSedeId = signal('');
  importLimit = signal(5);
  importing = signal(false);
  importResult = signal('');

  readonly estados = ['ACTIVO', 'INACTIVO', 'RETIRADO'] as const;

  ngOnInit() {
    this.loadSedes();
    this.loadEstudiantes();
  }

  loadSedes() {
    this.sedesService.getAll().subscribe({
      next: (data) => {
        this.sedes.set(data);
        if (!this.auth.isAdmin() && this.auth.user()?.sedeId) {
          this.form.sedeId = this.auth.user()!.sedeId!;
          this.importSedeId.set(this.auth.user()!.sedeId!);
        }
      },
      error: () => {},
    });
  }

  loadEstudiantes() {
    this.loading.set(true);
    this.error.set('');
    this.estudiantesService.getAll({
      sedeId: this.filterSedeId() || undefined,
      estado: this.filterEstado() || undefined,
      search: this.filterSearch() || undefined,
      page: this.currentPage(),
    }).subscribe({
      next: (res) => {
        this.estudiantes.set(res.data);
        this.totalPages.set(res.meta.pages);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar estudiantes');
        this.loading.set(false);
      },
    });
  }

  applyFilter() { this.currentPage.set(1); this.loadEstudiantes(); }
  clearFilters() {
    this.filterSedeId.set(''); this.filterEstado.set(''); this.filterSearch.set('');
    this.currentPage.set(1); this.loadEstudiantes();
  }
  prevPage() { if (this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.loadEstudiantes(); } }
  nextPage() { if (this.currentPage() < this.totalPages()) { this.currentPage.update(p => p + 1); this.loadEstudiantes(); } }

  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.form = {
      nombreCompleto: '', email: '', telefono: '', documento: '',
      sedeId: !this.auth.isAdmin() ? (this.auth.user()?.sedeId ?? '') : '',
      programa: '', estado: 'ACTIVO',
    };
    this.showModal.set(true);
  }

  openEdit(est: Estudiante) {
    this.editingId.set(est.id);
    this.formError.set('');
    this.form = {
      nombreCompleto: est.nombreCompleto, email: est.email, telefono: est.telefono,
      documento: est.documento, sedeId: est.sedeId, programa: est.programa, estado: est.estado,
    };
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  submitForm() {
    if (!this.form.nombreCompleto || !this.form.email || !this.form.telefono ||
        !this.form.documento || !this.form.sedeId || !this.form.programa) {
      this.formError.set('Por favor completa todos los campos');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const request$ = this.editingId()
      ? this.estudiantesService.update(this.editingId()!, this.form)
      : this.estudiantesService.create(this.form);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.successMsg.set(this.editingId() ? 'Estudiante actualizado' : 'Estudiante creado exitosamente');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.loadEstudiantes();
      },
      error: (err) => { this.formError.set(err?.error?.message ?? 'Error al guardar'); this.saving.set(false); },
    });
  }

  deleteEstudiante(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    this.estudiantesService.delete(id).subscribe({
      next: () => {
        this.successMsg.set('Estudiante eliminado');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.loadEstudiantes();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Error al eliminar'),
    });
  }

  openImport() { this.importResult.set(''); this.showImportModal.set(true); }
  closeImport() { this.showImportModal.set(false); }

  submitImport() {
    if (!this.importSedeId()) { this.importResult.set('Selecciona una sede'); return; }
    this.importing.set(true);
    this.importResult.set('');
    this.estudiantesService.importFromExternal(this.importSedeId(), this.importLimit()).subscribe({
      next: (res) => { this.importing.set(false); this.importResult.set(res.message); this.loadEstudiantes(); },
      error: (err) => { this.importResult.set(err?.error?.message ?? 'Error al importar'); this.importing.set(false); },
    });
  }

  estadoClass(estado: string): string {
    return { ACTIVO: 'badge-activo', INACTIVO: 'badge-inactivo', RETIRADO: 'badge-retirado' }[estado] ?? '';
  }
}
