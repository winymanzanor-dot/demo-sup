import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion } from '../../../models/coordinacion';
import { Agenda, Domicilio } from '../../../models/agenda';
import Swal from 'sweetalert2';


// Constantes para evitar "magic numbers/strings"
const RENDIMIENTO_POR_DEFECTO = 13;
const SEMANAS_ANIO = 52;

@Component({
  selector: 'app-agendas',
  standalone: false,
  templateUrl: './agendas.component.html',
  styleUrl: './agendas.component.css'
})
export class AgendasComponent {
// En tu componente RecorridoAgendaComponent
  coordinacion: string[] = []; // Debes poblarlo en loadCoordinaciones


  //Variables para agenda
  registrarAgenda: FormGroup;
  coordinaciones: Coordinacion[] = [];
  agendas: any[] = []; // Lista completa de agendas

  //
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = ''; // por defecto
  coordinadorSeleccionado: string = '';
  semanas: string[] = [];
  totalKm: number = 0;
  precioPorLitro: number = 0;
  domicilios: string[] = ["NA"];
  rendimientosCoordinadores: { [nombre: string]: number } = {};

    meses: string[] = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  constructor(
    private fb: FormBuilder,
    private _coordinacionService: CoordinacionService) {
    this.registrarAgenda = this.initForm();
    this.generateWeeks();
  }

  fixUTCDateToLocal(dateStr: string): Date {
    const date = new Date(dateStr);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }


  ngOnInit(): void {
    this.loadCoordinaciones();
    this.loadDomicilios();
    this.setupFormListeners();
     this._coordinacionService.obtenerCoordinacion().subscribe(data => {
        this.coordinaciones = data;
      });

  }
  private initForm(): FormGroup {
    return this.fb.group({
      coordinador: ['', Validators.required],
      semana: ['', Validators.required],
      fecha: ['', Validators.required],
      objetivo: [''],
      meta: [''],
      cumplimientoAgenda: [false],
      actividades: this.fb.array([this.crearActividad()])
    });
  }


  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO },
      (_, i) => `SEMANA ${i + 1}`);
  }

  // Cargar datos iniciales
  private loadCoordinaciones(): void {
    this._coordinacionService.obtenerCoordinacion().subscribe(data => {
      this.coordinaciones = data;
      this.setRendimientos(data);
    });
  }


  private loadDomicilios(): void {
    this._coordinacionService.getDomicilios().subscribe((res: Domicilio[]) => {
      this.domicilios = res.map(d => d.nombre);
    });
  }

  private setRendimientos(coordinaciones: Coordinacion[]): void {
    coordinaciones.forEach(coord => {
      coord.coordinador.forEach((c: any) => {
        this.rendimientosCoordinadores[c.nombre] = c.rendimiento ?? RENDIMIENTO_POR_DEFECTO;
      });
    });
  }

  // Configurar listeners del formulario
  private setupFormListeners(): void {
    this.registrarAgenda.get('traslado')?.valueChanges.subscribe(value => {
      const kmControl = this.registrarAgenda.get('kmRecorrido');
      value === 'SI' ? kmControl?.enable() : kmControl?.disable();
    });
  }

  mostrarDiv(nombre: string): void {
    this.coordinadorVisible = nombre;
    this.registrarAgenda.get('coordinador')?.setValue(nombre);
  }

  crearActividad(): FormGroup {
    return this.fb.group({
      hora: ['', Validators.required],
      domicilio: [''],
      actividad: [''],
      codigo: [''],
      acordeObjetivo: [false],
      traslado: ['', Validators.required],
      kmRecorrido: ['']
    });

  }


  get actividades(): FormArray {
    return this.registrarAgenda.get('actividades') as FormArray;
  }

  agregarActividad(): void {
    this.actividades.push(this.crearActividad());
  }

  eliminarActividad(index: number): void {
    this.actividades.removeAt(index);
  }

  // CRUD operations
  RegistrarAgenda(): void {
    if (this.registrarAgenda.invalid) {
      this.showToast('error', 'Por favor, revisa los campos obligatorios del formulario.');
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas registrar esta(s) actividad(es)?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.saveAgenda();
      }
    });
  }

  private saveAgenda(): void {
    const datos = this.registrarAgenda.value;
    const requests = this.actividades.value.map((actividad: any) => {
      const agenda: Agenda = {
        coordinador: datos.coordinador,
        semana: datos.semana,
        fecha: datos.fecha,
        objetivo: datos.objetivo,
        meta: datos.meta,
        cumplimientoAgenda: datos.cumplimientoAgenda,
        ...actividad
      };

      return this._coordinacionService.registrarAgenda(agenda);
    });

    Promise.all(requests.map((req: { toPromise: () => any; }) => req.toPromise()))
      .then(() => {
        this.showToast('success', 'Actividades registradas con éxito');
        this.refrescarAgendas();
        this.actividades.clear();
        this.actividades.push(this.crearActividad());
      })
      .catch(error => {
        console.error('Error al registrar agenda:', error);
        this.showToast('error', 'Error al registrar las actividades');
      });
  }


  seleccionarCoordinador(coord: Coordinacion | null): void {
    this.selectedCoord = coord;

    if (coord?.coordinador?.[0]?.nombre) {
      this.registrarAgenda.get('coordinador')?.setValue(coord.coordinador[0].nombre);
    } else {
      this.registrarAgenda.get('coordinador')?.setValue('');
    }
  }


  refrescarAgendas(): void {
    this._coordinacionService.obtenerAgendas().subscribe(data => {
      this.agendas = data.map((agenda: { fecha: string; }) => ({
        ...agenda,
        fecha: this.fixUTCDateToLocal(agenda.fecha)
      }));
    });
  }


  opcionesCodigo = [
    { value: 'AG', texto: 'AG | Aseo General', color: '#ffcccc' },
    { value: 'GA', texto: 'GA | Gestión Administrativa', color: '#ffe6cc' },
    { value: 'C', texto: 'C | Cobranza', color: '#d9ead3' },
    { value: 'D', texto: 'D | Domiciliar', color: '#cfe2f3' },
    { value: 'Dep', texto: 'Dep | Depósitar', color: '#d9d2e9' },
    { value: 'E', texto: 'E | Entregas', color: '#fce5cd' },
    { value: 'GN', texto: 'GN | Grupo Nuevo', color: '#f4cccc' },
    { value: 'INT', texto: 'INT | Integración', color: '#d0e0e3' },
    { value: 'R', texto: 'R | Pago', color: '#ead1dc' },
    { value: 'R/A', texto: 'R/A | Realizando Agendas', color: '#c9daf8' },
    { value: 'RM', texto: 'RM | Reunión Mensual', color: '#ffcccb' },
    { value: 'RS', texto: 'RS | Reunión Semanal', color: '#b6d7a8' },
    { value: 'VTA', texto: 'VTA | Promoción', color: '#a2c4c9' },
    { value: 'Sup', texto: 'Sup | Supervisión', color: '#d5a6bd' },
    { value: 'S/Renov', texto: 'S/Renov | Sup.Renovación', color: '#b4a7d6' },
    { value: 'Sin Codigo', texto: 'Sin código', color: '#eeeeee' },
    { value: '', texto: '', color: '#ffffff' }
  ];






  // Helper para notificaciones
  private showToast(icon: 'success' | 'error', title: string): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    Toast.fire({ icon, title });
  }

}
