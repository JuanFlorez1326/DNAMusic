import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, RegisterUserDto } from '../../core/services/auth.service';
import { SedesService } from '../sedes/services/sedes.service';
import { Sede } from '../../shared/models/sede.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
})
export class UsuariosPage implements OnInit {
  private authService = inject(AuthService);
  private sedesService = inject(SedesService);

  sedes = signal<Sede[]>([]);
  showModal = signal(false);
  saving = signal(false);
  successMsg = signal('');
  formError = signal('');

  form: RegisterUserDto = { nombre: '', email: '', password: '', role: 'OPERADOR', sedeId: '' };

  ngOnInit() {
    this.sedesService.getAll().subscribe({ next: (s) => this.sedes.set(s), error: () => {} });
  }

  openModal() {
    this.form = { nombre: '', email: '', password: '', role: 'OPERADOR', sedeId: '' };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  onRoleChange() {
    if (this.form.role === 'ADMIN') this.form.sedeId = '';
  }

  submit() {
    if (!this.form.nombre || !this.form.email || !this.form.password) {
      this.formError.set('Nombre, email y contraseña son requeridos');
      return;
    }
    if (this.form.role === 'OPERADOR' && !this.form.sedeId) {
      this.formError.set('Un OPERADOR debe tener sede asignada');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const payload: RegisterUserDto = { ...this.form };
    if (payload.role === 'ADMIN') delete payload.sedeId;

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.closeModal();
        this.successMsg.set(`Usuario ${res.user.email} creado exitosamente`);
        setTimeout(() => this.successMsg.set(''), 4000);
      },
      error: (err) => { this.formError.set(err?.error?.message ?? 'Error al crear usuario'); this.saving.set(false); },
    });
  }
}
