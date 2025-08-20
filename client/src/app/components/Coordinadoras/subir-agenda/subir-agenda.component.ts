import { Component } from '@angular/core';
import { Agenda } from '../../../models/agenda';
import * as XLSX from 'xlsx';
import { ActividadPipe } from '../../../pipes/actividad.pipe';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion } from '../../../models/coordinacion';
import Swal from 'sweetalert2';

const SEMANAS_ANIO = 31;

@Component({
  selector: 'app-subir-agenda',
  standalone: false,
  templateUrl: './subir-agenda.component.html',
  styleUrl: './subir-agenda.component.css',
  providers: [ActividadPipe]

})
export class SubirAgendaComponent {
  agendas: Agenda[] = [];
  selectedCoordinador: string = '';
  selectedObjetivos: string[] = [];
  selectedMeta: string = '';
  agendaATiempo: boolean = false;
  coordinacion: string[] = []; // Debes poblarlo en loadCoordinaciones
  coordinaciones: Coordinacion[] = [];
  semanas: string[] = [];

  filtroActividad = '';

  actividad: string = '';
  selectedWeek: string = '';

  constructor(private _coordinacionService: CoordinacionService,){
        this.generateWeeks();
  }

  excelSerialDateToJSDate(serial: number): string {
    const excelEpoch = new Date(1899, 11, 30); // Excel base date
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0]; // Solo la parte de la fecha (yyyy-mm-dd)
  }

  excelSerialTimeToJSTime(serial: number): string {
    const totalSeconds = Math.round(serial * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }


  ngOnInit() {
  this.loadCoordinaciones();
  const datosGuardados = localStorage.getItem('agendas');
  if (datosGuardados) {
    this.agendas = JSON.parse(datosGuardados);
  }
}

  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO },
      (_, i) => `SEMANA ${i + 22}`); //SE INICIA EN 1 PERO COMO LA SEMANA ACTUAL ES MAYOR A 20 SE PONE 20 PARA EVITAR DESPLEGAR TANTO
  }

  // Cargar datos iniciales
  private loadCoordinaciones(): void {
    this._coordinacionService.obtenerCoordinacion().subscribe(data => {
      this.coordinaciones = data;
    });
  }


  onFileChange(evt: any): void {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) return;

    const file = target.files[0];
    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Mapeo de las columnas del archivo a la interfaz Agenda
      this.agendas = (data as any[]).map((row: any): Agenda => {
        const rawFecha = row['Fecha'];
        const rawHora = row['Hora'];

        const fecha = !isNaN(rawFecha) ? this.excelSerialDateToJSDate(Number(rawFecha)) : rawFecha;
        const hora = !isNaN(rawHora) ? this.excelSerialTimeToJSTime(Number(rawHora)) : rawHora;

          return {
            semana: row['Semana'] || '',
            coordinador: row['Coordinador'] || '',
            fecha,
            objetivo: row['Objetivo'] || '',
            meta: row['Meta'] || '',
            hora,
            domicilio: row['Domicilio'] || '',
            actividad: row['Actividad'] || '',
            codigo: row['Código'] || '',
            codigoReportado: row['Código Reportado'] || '',
            actividadReportada: row['Actividad Reportada'] || '',
            reportado: row['Reportado']?.toString().toLowerCase() === 'true',
            horaReporte: row['Hora Reporte'] || '',
            horaCierre: row['Hora Cierre'] || '',
            traslado: row['Traslado'] || 'NO',
            kmRecorrido: parseFloat(row['Km Recorrido']) || 0,
            cumplimientoAgenda: row['Cumplimiento Agenda']?.toString().toLowerCase() === 'true',
            acordeObjetivo: row['Acorde Objetivo']?.toString().toLowerCase() === 'true'
          };
        });

    };

    reader.readAsBinaryString(file);
  }


    objetivosDisponibles: string[] = [
    'Reducir mora',
    'Grupos nuevos',
    'Clientes nuevos',
    'Cierre de fichas',
    'Renovación de lo proyectado'
  ];

  onObjetivoChange(event: any) {
    const objetivo = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
      if (!this.selectedObjetivos.includes(objetivo)) {
        this.selectedObjetivos.push(objetivo);
      }
    } else {
      this.selectedObjetivos = this.selectedObjetivos.filter(o => o !== objetivo);
    }
}

    guardarAgenda() {
      this.agendas = this.agendas.map(agenda => ({
        ...agenda,
        semana: this.selectedWeek,
        coordinador: this.selectedCoordinador,
        objetivo: this.selectedObjetivos.join(', '),
        meta: this.selectedMeta,
        cumplimientoAgenda: this.agendaATiempo
      }));

      // Enviar cada agenda al backend
      this.agendas.forEach(agenda => {
        this._coordinacionService.registrarAgenda(agenda).subscribe({
          next: response => {
            console.log('Agenda registrada:', response);
          },
          error: err => {
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
          title: "Error al registrar la agenda."
        });
          }
        });
      });
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
            icon: "success",
            title: "¡Las Agendas han sido registradas con éxito!"
          });
    }


  //Metodo para eliminar una fila
  eliminarAgenda(index: number) {
  if (confirm('¿Estás segura/o de eliminar esta fila de la agenda?')) {
    this.agendas.splice(index, 1);
  }
}


  //Metodo para limpiar tabla
  limpiarAgendas() {
  this.agendas = [];
  localStorage.removeItem('agendas');
  alert('Se ha limpiado la agenda cargada.');
}


}
