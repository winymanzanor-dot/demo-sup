// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }

    // Decodificar token para obtener rol
    const payload = JSON.parse(atob(token.split('.')[1]));
    const rol = payload.rol;

    // roles que pueden ingresar
    const rolesPermitidos = route.data['roles'] as Array<string>;

    if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
      
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      });
      Toast.fire({
        icon: "error",
        title: "Acceso restringido. No tiene autorización para ingresar a esta liga."
      });
      this.router.navigate(['/inicio']); // o a otra ruta
      return false;
    }

    return true;
  }
}
