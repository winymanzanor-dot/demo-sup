import { Component, OnInit } from '@angular/core';
import { Coordinacion } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Agenda, Domicilio } from '../../../models/agenda';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ViewChild, ElementRef } from '@angular/core';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';



// Constantes para evitar "magic numbers/strings"
const RENDIMIENTO_POR_DEFECTO = 13;
const DELAY_PDF_GENERATION = 500;
const SEMANAS_ANIO = 52;

@Component({
  selector: 'app-recorrido-agenda',
  standalone: false,
  templateUrl: './recorrido-agenda.component.html',
  styleUrls: ['./recorrido-agenda.component.css'],
})


export class RecorridoAgendaComponent implements OnInit {
  // ViewChilds
  @ViewChild('graficaCodigo') graficaCodigo!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reportePDF') reportePDF!: ElementRef;
  @ViewChild('graficaHoras') graficaHoras!: ElementRef;
  @ViewChild('graficaProductividad') graficaProductividad!: ElementRef;
  @ViewChild('entregasChart') entregasChart!: ElementRef;

  agendasFiltradasPorCoordinador: any[] = [];

  //Variables para agenda
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


  actividadSeleccionada: any = null;

  //horas de trabajo para métricas del mes
  horasAgenda: number = 0;
  horasTrabajo: number = 0;

  //variables para filtrar por mes, dia y año
  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';

  codigoSeleccionado: string = '';
  codigoReportadoSeleccionado: string = '';
  estadoSeleccionado: string = '';
  //Variables de las graficas
  chart: any;
  chartCodigo: any;
  mostrarContenedorGraficas: boolean = false;
  codigosReportados: any;
  chartProductividad: any;


  constructor(
    private fb: FormBuilder,
    private _coordinacionService: CoordinacionService) {
    this.generateWeeks();
  }

  fixUTCDateToLocal(dateStr: string): Date {
    const date = new Date(dateStr);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  ngOnInit(): void {
    this.loadCoordinaciones();
    this.loadAgendas();
  }


  editarActividad(agenda: any) {
    this.actividadSeleccionada = {
      domicilio: { nombre: '' },
      ...agenda,
    };
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

  private loadAgendas(): void {
    this._coordinacionService.obtenerAgendas1(1, 315).subscribe({
      next: response => {
        this.agendas = response.agendas.map((agenda: { fecha: string }) => ({
          ...agenda,
          fecha: this.fixUTCDateToLocal(agenda.fecha)
        }));
        this.filtrarAgendas();
      },
      error: err => {
        console.error('Error al cargar agendas:', err);
      }
    });
  }




  private setRendimientos(coordinaciones: Coordinacion[]): void {
    coordinaciones.forEach(coord => {
      coord.coordinador.forEach((c: any) => {
        this.rendimientosCoordinadores[c.nombre] = c.rendimiento ?? RENDIMIENTO_POR_DEFECTO;
      });
    });
  }

    mostrarDiv(nombre: string): void {
      this.coordinadorVisible = nombre;
      this.filtrarAgendas(); // Filtro inmediato al cambiar de coordinador
    }



  // Operaciones CRUD
  eliminarRegistro(id: string): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción no puede ser revertida",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar"
    }).then((result) => {
      if (result.isConfirmed) {
        this._coordinacionService.eliminarAgenda(id).subscribe({
          next: () => {
            this.showToast('success', 'Agenda eliminada correctamente');
            this.loadAgendas();
          },
          error: (error) => {
            console.error('Error al eliminar agenda:', error);
            this.showToast('error', 'Error al eliminar la agenda');
          }
        });
      }
    });
  }


    refrescarAgendas(): void {
      this._coordinacionService.obtenerAgendas1().subscribe(data => {
        this.agendas = data.map((agenda: { fecha: string }) => ({
          ...agenda,
          fecha: this.fixUTCDateToLocal(agenda.fecha)
        }));
        this.filtrarAgendas(); // Aplicar filtros después de cargar
      });
    }

    filtrarAgendas(): void {
      this.agendasFiltradasPorCoordinador = this.agendas.filter(agenda => {
        if (!agenda.coordinador) return false;

        const fechaObj = new Date(agenda.fecha);
        if (isNaN(fechaObj.getTime())) return false;

        const mesNombre = fechaObj.toLocaleString('es-MX', { month: 'long' });
        const diaNombre = fechaObj.toLocaleString('es-MX', { weekday: 'long' });
        const semanaTrimmed = agenda.semana?.trim() || '';

        const cumpleCoordinador = this.coordinadorVisible
          ? agenda.coordinador.toLowerCase() === this.coordinadorVisible.toLowerCase()
          : true;

        const cumpleMes = this.mesSeleccionado
          ? mesNombre.toLowerCase() === this.mesSeleccionado.toLowerCase()
          : true;

        const cumpleSemana = this.semanaSeleccionada
          ? semanaTrimmed === this.semanaSeleccionada
          : true;

        const cumpleDia = this.diaSeleccionado
          ? diaNombre.toLowerCase() === this.diaSeleccionado.toLowerCase()
          : true;

        const cumpleCodigo = this.codigoSeleccionado
          ? agenda.codigo === this.codigoSeleccionado
          : true;

        const cumpleCodigoReportado = this.codigoReportadoSeleccionado
          ? agenda.codigoReportado === this.codigoReportadoSeleccionado
          : true;

        const cumpleEstado = this.estadoSeleccionado
          ? (this.estadoSeleccionado === 'reportado' ? agenda.reportado === true : agenda.reportado === false)
          : true;

        return cumpleCoordinador &&
          cumpleMes &&
          cumpleSemana &&
          cumpleDia &&
          cumpleCodigo &&
          cumpleCodigoReportado &&
          cumpleEstado;
      });
    }



  aplicarFiltros(): void {
    // Actualizar métricas y gráficos si es necesario
    if (this.mostrarContenedorGraficas) {
      this.dibujarGraficaPorCodigo();
      this.dibujarGraficaReporteadasVsNoReportadas();
    }
  }

  // Método para limpiar filtros
  limpiarFiltros(): void {
    this.mesSeleccionado = '';
    this.semanaSeleccionada = '';
    this.diaSeleccionado = '';
    this.codigoSeleccionado = '';
    this.codigoReportadoSeleccionado = '';
    this.estadoSeleccionado = '';
    this.aplicarFiltros();
  }


  guardarCambios(agenda: Agenda): void {
    if (!agenda._id) return;

    this._coordinacionService.actualizarAgenda(agenda._id, {
      domicilio: agenda.domicilio,
      actividad: agenda.actividad,
      hora: agenda.hora,
      codigo: agenda.codigo,
      codigoReportado: agenda.codigoReportado,
      actividadReportada: agenda.actividadReportada,
      reportado: agenda.reportado,
      horaReporte: agenda.horaReporte,
      horaCierre: agenda.horaCierre,
      acordeObjetivo: agenda.acordeObjetivo,
      kmRecorrido: agenda.kmRecorrido

    }).subscribe({
      next: () => this.showToast('success', 'Cambios guardados correctamente'),
      error: (error) => {
        console.error('Error al actualizar agenda:', error);
        this.showToast('error', 'Error al guardar cambios');
      }
    });
  }

  // Metrics calculations
// Métricas de reporte
  get totalKmRecorridos(): number {
    return +this.agendasFiltradasPorCoordinador
      .reduce((acc, curr) => acc + (curr.kmRecorrido || 0), 0)
      .toFixed(2);
  }

  get litrosGasolina(): number {
    const rendimiento = this.rendimientosCoordinadores[this.coordinadorVisible] ?? RENDIMIENTO_POR_DEFECTO;
    return this.totalKmRecorridos > 0
      ? parseFloat((this.totalKmRecorridos / rendimiento).toFixed(2))
      : 0;
  }

  get costoTotalGasolina(): number {
    return +(this.litrosGasolina * this.precioPorLitro).toFixed(2);
  }

  get horasAgendadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(a => a.hora).length;
  }

  get horasReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true
    ).length;
  }


  /////////////////////////////////////////////////////////////////////////////////////
  get horasEntregas(): number {
	  return this.agendasFiltradasPorCoordinador.filter(
		a => a.hora && a.codigo === 'E'
	  ).length;
  }

  get horasEntregasReportadas(): number {
	return this.agendasFiltradasPorCoordinador.filter(
	  a => a.horaReporte && a.reportado === true && a.codigo === 'E'
	).length;
  }

  get horasEntregasNoReportadas(): number {
    return this.horasEntregas - this.horasEntregasReportadas;
  }
	// DOS
  get horasPagos(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'R'
    ).length;
  }

  get horasPagosReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'R'
    ).length;
  }
	// TRES

  get horasRP(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'R/P'
    ).length;
  }

  get horasRPReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'R/P'
    ).length;
  }

  // CUATRO
  get horasCobranza(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'C'
    ).length;
  }

  get horasCobranzasReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'C'
    ).length;
  }
	// CINCO
  get horasVentas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'E'
    ).length;
  }

  get horasVentasReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'E'
    ).length;
  }
	// SEIS
  get horasGrupoN(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'E'
    ).length;
  }

  get horashorasGrupoNReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'GN'
    ).length;
  }

	// SIETE
  get horasSup(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'Sup'
    ).length;
  }

  get horasSupReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'Sup'
    ).length;
  }

	// OCHO
  get horasAten(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'Aten'
    ).length;
  }

  get horasAtenReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'Sup'
    ).length;
  }

	// NUEVE
  get horasReA(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'R/A'
    ).length;
  }

  get horasReAReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'R/A'
    ).length;
  }

	// DIEZ
  get horasDomiciliar(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'R/A'
    ).length;
  }

  get horasDomiciliarReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'Sup'
    ).length;
  }

	// ONCE
  get horasSC(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'Sin Codigo'
    ).length;
  }

  get horasSCReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'Sin Codigo'
    ).length;
  }
  
	// DOCE
  get horasAM(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'AM'
    ).length;
  }

  get horasAMReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'AM'
    ).length;
  }

	// TRECE
  get horasReunion(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'RM' && 'RS'
    ).length;
  }

  get horasReunionesRep(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'RM' && 'RS'
    ).length;
  }
	// CATORCE
	get horasRenov(): number {
		return this.agendasFiltradasPorCoordinador.filter(
			a => a.hora && a.codigo === 'S/Renov'
		).length;
	}

	get horasRenovReportadas(): number {
		return this.agendasFiltradasPorCoordinador.filter(
			a => a.horaReporte && a.reportado === true && a.codigo === 'S/Renov'
		).length;
	}
		

	get horasProductividad(): number {
		return this.horasAgendadas > 0
			? parseFloat(((this.horasReportadas / this.horasTrabajo)*100).toFixed(2))
			: 0;
	}

  /////////////////////////////////////////////////////////////////////////////////////


    

  opcionesCodigo = [
    { value: 'AG', texto: 'AG | Aseo General' },
    { value: 'AM', texto: 'AM | Actividades Matutinas' },
    { value: 'C', texto: 'C | Cobranza' },
    { value: 'D', texto: 'D | Domiciliar' },
    { value: 'Dep', texto: 'Dep | Depósitar' },
    { value: 'E', texto: 'E | Entregas' },
    { value: 'GN', texto: 'GN | Grupo Nuevo' },
    { value: 'INT', texto: 'INT | Integración' },
    { value: 'R', texto: 'R | Pago' },
    { value: 'R/A', texto: 'R/A | Realizando Agendas' },
    { value: 'RM', texto: 'R/M | Reunión Mensual' },
    { value: 'RS', texto: 'RS | Reunión Semanal' },
    { value: 'VTA', texto: 'VTA | Promoción' },
    { value: 'Sup', texto: 'Sup | Supervisión' },
    { value: 'S/Renov', texto: 'S/Renov | Seg.Renovación' },
    { value: 'Sin Codigo', texto: 'Sin Codigo' },
    { value: '', texto: '' }
  ];
  
  dibujarGraficaProductividad(): void {
  if (!this.graficaProductividad) return;

  if (this.chartProductividad) this.chartProductividad.destroy();

  const productividad = this.horasProductividad;
  const restante = 100 - productividad;

  const ctx = this.graficaProductividad.nativeElement.getContext('2d');
  if (!ctx) return;

  this.chartProductividad = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Productividad (%)', 'Resto'],
      datasets: [{
        data: [productividad, restante],
        backgroundColor: ['#4caf50', '#e0e0e0'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Porcentaje de Productividad'
        },
        tooltip: {
          callbacks: {
            label: context => `${context.label}: ${context.parsed.toFixed(2)}%`
          }
        },
        datalabels: {
          display: true,
          color: '#000',
          formatter: (value, ctx) => {
            const label = ctx.chart.data.labels?.[ctx.dataIndex];
            return `${label}: ${value.toFixed(1)}%`;
          },
          font: {
            weight: 'bold',
            size: 12
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}


  generarGraficaEntregas(): void {
    const ctx = document.getElementById('entregasChart') as HTMLCanvasElement;

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Agendadas', 'Reportadas', 'No Reportadas'],
        datasets: [{
          label: 'Horas de Entregas',
          data: [
            this.horasEntregas,
            this.horasEntregasReportadas,
            this.horasEntregasNoReportadas
          ],
          backgroundColor: ['#42A5F5', '#66BB6A', '#EF5350']
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }  

  // Chart methods
  mostrarGraficas(): void {
    this.mostrarContenedorGraficas = !this.mostrarContenedorGraficas;
    if (this.mostrarContenedorGraficas) {
      setTimeout(() => {
        this.dibujarGraficaPorCodigo();
        this.dibujarGraficaReporteadasVsNoReportadas();
        this.dibujarGraficaProductividad();
      }, 100);
    } else {
      this.destroyCharts();
    }
  }

  private destroyCharts(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (this.chartCodigo) {
      this.chartCodigo.destroy();
      this.chartCodigo = null;
    }
  }

  dibujarGraficaPorCodigo(): void {
    if (!this.mostrarContenedorGraficas || !this.graficaCodigo) return;

    if (this.chartCodigo) this.chartCodigo.destroy();

    const conteo: Record<string, { reportadas: number; noReportadas: number }> = {};

    this.opcionesCodigo.forEach(op => {
      conteo[op.texto] = { reportadas: 0, noReportadas: 0 };
    });

    this.agendasFiltradasPorCoordinador.forEach(agenda => {
      const textoCodigo = this.opcionesCodigo.find(op => op.value === agenda.codigo)?.texto;
      if (!textoCodigo) return;

      if (agenda.reportado) {
        conteo[textoCodigo].reportadas++;
      } else {
        conteo[textoCodigo].noReportadas++;
      }
    });

    const etiquetas = Object.keys(conteo);
    const datosReportadas = etiquetas.map(et => conteo[et].reportadas);
    const datosNoReportadas = etiquetas.map(et => conteo[et].noReportadas);

    const ctx = this.graficaCodigo.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartCodigo = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Reportadas',
            data: datosReportadas,
            backgroundColor: 'rgba(76, 175, 80, 0.7)',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 1
          },
          {
            label: 'No Reportadas',
            data: datosNoReportadas,
            backgroundColor: 'rgba(244, 67, 54, 0.7)',
            borderColor: 'rgba(244, 67, 54, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0
            },
            stacked: false
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            },
            title: {
              display: true,
              text: 'Cantidad de Agendas'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          title: {
            display: true,
            text: 'Agendas por Código (Reportadas vs No Reportadas)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          datalabels: {
            color: '#000',
            anchor: 'end',
            align: 'start',
            font: {
              size: 11,
              weight: 'bold'
            },
            formatter: (value) => value
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }


  dibujarGraficaReporteadasVsNoReportadas(): void {
    if (!this.mostrarContenedorGraficas || !this.graficaHoras) return;

    if (this.chart) this.chart.destroy();

    const total = this.agendasFiltradasPorCoordinador.length;
    const reportadas = this.agendasFiltradasPorCoordinador.filter(a => a.reportado === true).length;
    const noReportadas = total - reportadas;

    const ctx = this.graficaHoras.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Reportadas', 'No Reportadas'],
        datasets: [{
          data: [reportadas, noReportadas],
          backgroundColor: ['#4caf50', '#f44336']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Horas Reportadas vs No Reportadas'
          },
          datalabels: {
            formatter: (value, context) => {
              const rawData = context.chart.data.datasets[0].data;
              const total = (rawData as number[])
                .filter((v): v is number => typeof v === 'number')
                .reduce((a, b) => a + b, 0);

              if (total === 0) return '0 (0%)';

              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            },
            color: '#fff'
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }


  // PDF Generation
  generarPDFConGrafica(): void {
    Swal.fire({
      title: 'Generando PDF...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading
    });

    setTimeout(() => {
      const element = this.reportePDF.nativeElement;

      html2canvas(element).then(canvas => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.text(`Reporte de ${this.coordinadorVisible}`, 10, 10);
        pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight - 20);
        pdf.save(`reporte_${this.coordinadorVisible}.pdf`);

        Swal.close();
        this.showToast('success', 'PDF generado correctamente');
      }).catch(error => {
        console.error('Error al generar PDF:', error);
        Swal.fire('Error', 'No se pudo generar el PDF', 'error');
      });
    }, DELAY_PDF_GENERATION);
  }

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
