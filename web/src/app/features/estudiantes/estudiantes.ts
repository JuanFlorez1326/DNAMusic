import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Estudiante, Sede, CreateEstudianteDto } from '../../shared/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiantes.html',
  styleUrls: ['./estudiantes.css'],
})
export class EstudiantesPage implements OnInit {
  private api = inject(ApiService);
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
  saving = signal(false);
  formError = signal('');
  form: CreateEstudianteDto = {
    nombreCompleto: '',
    email: '',
    telefono: '',
    documento: '',
    sedeId: '',
    programa: '',
    estado: 'ACTIVO',
  };

  readonly estados = ['ACTIVO', 'INACTIVO', 'RETIRADO'] as const;

  ngOnInit() {
    this.loadSedes();
    this.loadEstudiantes();
  }

  loadSedes() {
    this.api.getSedes().subscribe({
      next: (data) => {
        this.sedes.set(data);
        if (!this.auth.isAdmin() && this.auth.user()?.sedeId) {
          this.form.sedeId = this.auth.user()!.sedeId!;
        }
      },
      error: () => {},
    });
  }

  loadEstudiantes() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .getEstudiantes({
        sedeId: this.filterSedeId() || undefined,
        estado: this.filterEstado() || undefined,
        search: this.filterSearch() || undefined,
        page: this.currentPage(),
      })
      .subscribe({
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

  applyFilter() {
    this.currentPage.set(1);
    this.loadEstudiantes();
  }

  clearFilters() {
    this.filterSedeId.set('');
    this.filterEstado.set('');
    this.filterSearch.set('');
    this.currentPage.set(1);
    this.loadEstudiantes();
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadEstudiantes();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadEstudiantes();
    }
  }

  openModal() {
    this.formError.set('');
    this.form = {
      nombreCompleto: '',
      email: '',
      telefono: '',
      documento: '',
      sedeId: !this.auth.isAdmin() ? (this.auth.user()?.sedeId ?? '') : '',
      programa: '',
      estado: 'ACTIVO',
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitForm() {
    if (
      !this.form.nombreCompleto ||
      !this.form.email ||
      !this.form.telefono ||
      !this.form.documento ||
      !this.form.sedeId ||
      !this.form.programa
    ) {
      this.formError.set('Por favor completa todos los campos');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    this.api.createEstudiante(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.successMsg.set('Estudiante creado exitosamente');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.loadEstudiantes();
      },
      error: (err) => {
        this.formError.set(err?.error?.message ?? 'Error al crear estudiante');
        this.saving.set(false);
      },
    });
  }

  deleteEstudiante(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;

    this.api.deleteEstudiante(id).subscribe({
      next: () => {
        this.successMsg.set('Estudiante eliminado');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.loadEstudiantes();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al eliminar estudiante');
      },
    });
  }

  estadoClass(estado: string): string {
    return { ACTIVO: 'badge-activo', INACTIVO: 'badge-inactivo', RETIRADO: 'badge-retirado' }[estado] ?? '';
  }
}
