import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SedesService } from './services/sedes.service';
import { Sede, CreateSedeDto } from '../../shared/models/sede.model';

@Component({
  selector: 'app-sedes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sedes.html',
  styleUrls: ['./sedes.css'],
})
export class SedesPage implements OnInit {
  private sedesService = inject(SedesService);

  sedes = signal<Sede[]>([]);
  loading = signal(false);
  error = signal('');
  successMsg = signal('');

  showModal = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  formError = signal('');

  form: CreateSedeDto = { nombre: '', ciudad: '', direccion: '', activa: true };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.sedesService.getAll().subscribe({
      next: (data) => { this.sedes.set(data); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message ?? 'Error al cargar sedes'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form = { nombre: '', ciudad: '', direccion: '', activa: true };
    this.formError.set('');
    this.showModal.set(true);
  }

  openEdit(sede: Sede) {
    this.editingId.set(sede.id);
    this.form = { nombre: sede.nombre, ciudad: sede.ciudad, direccion: sede.direccion, activa: sede.activa };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  submit() {
    if (!this.form.nombre || !this.form.ciudad || !this.form.direccion) {
      this.formError.set('Todos los campos son requeridos');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const request$ = this.editingId()
      ? this.sedesService.update(this.editingId()!, this.form)
      : this.sedesService.create(this.form);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.successMsg.set(this.editingId() ? 'Sede actualizada' : 'Sede creada');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.load();
      },
      error: (err) => { this.formError.set(err?.error?.message ?? 'Error al guardar'); this.saving.set(false); },
    });
  }

  toggleActiva(sede: Sede) {
    this.sedesService.update(sede.id, { activa: !sede.activa }).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Error'),
    });
  }

  delete(sede: Sede) {
    if (!confirm(`¿Eliminar "${sede.nombre}"? No se puede deshacer.`)) return;
    this.sedesService.delete(sede.id).subscribe({
      next: () => {
        this.successMsg.set('Sede eliminada');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Error al eliminar'),
    });
  }
}
