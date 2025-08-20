import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

 isScrolled = false;
  estaLogueado = false;
  rolUsuario = '';
  private authSubscription!: Subscription;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Suscribirse al estado de autenticación para actualizar en tiempo real
    this.authSubscription = this.authService.autenticado$.subscribe((estado) => {
      this.estaLogueado = estado;

      if (estado) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.rolUsuario = payload.rol;
          } catch {
            this.rolUsuario = '';
          }
        }
      } else {
        this.rolUsuario = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe(); // evitar fugas de memoria
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  isActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'exact',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }
  cerrarSesion() {
    this.authService.logout();  // Elimina el token y/o limpia sesión
    this.router.navigate(['/iniciar-sesion']);  // Usa '/' y un array
  }

}
