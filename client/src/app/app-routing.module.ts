import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { AgendasComponent } from './components/Coordinadoras/agendas/agendas.component';
import { ReporteAgendasComponent } from './components/Coordinadoras/reporte-agendas/reporte-agendas.component';
import { IniciarSesionComponent } from './components/Shared/iniciar-sesion/iniciar-sesion.component';
import { AuthGuard } from './guards/auth.guard';
import { SubirAgendaComponent } from './components/Coordinadoras/subir-agenda/subir-agenda.component';

const routes: Routes = [
  { path: 'baucher', component: BauchersComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'recorrido-agenda', component: RecorridoAgendaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'reporte-agendas', component: ReporteAgendasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'agendas', component: AgendasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'registrar-agendas', component: AgendasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'subir-agendas', component: SubirAgendaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'iniciar-sesion', component: IniciarSesionComponent},
  { path: 'inicio', component: InicioComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: '**', redirectTo: 'inicio' }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }