import { Component } from '@angular/core';
import { Coordinacion } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Agenda, Domicilio } from '../../../models/agenda';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ViewChild, ElementRef } from '@angular/core';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';



// Constantes para evitar "magic numbers/strings"
const RENDIMIENTO_POR_DEFECTO = 13;
const DELAY_PDF_GENERATION = 500;
const SEMANAS_ANIO = 52;

@Component({
  selector: 'app-reporte-agendas',
  standalone: false,
  templateUrl: './reporte-agendas.component.html',
  styleUrl: './reporte-agendas.component.css'
})
export class ReporteAgendasComponent {
  // ViewChilds
  @ViewChild('graficaCodigo') graficaCodigo!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reportePDF') reportePDF!: ElementRef;
  @ViewChild('graficaHoras') graficaHoras!: ElementRef;

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

    
  //horas de trabajo para métricas del mes
  horasAgenda: number = 0;
  horasTrabajo: number = 0;

  //variables para filtrar por mes, dia y año
  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';

  //Variables de las graficas
  chart: any;
  chartCodigo: any;
  mostrarContenedorGraficas: boolean = false;

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
    this.loadAgendas();
  }


  private initForm(): FormGroup {
    return this.fb.group({
      coordinador: [''],
      semana: ['', Validators.required],
      fecha: ['', Validators.required],
      objetivo: [''],
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

  private loadAgendas(): void {
    this._coordinacionService.obtenerAgendas().subscribe(response => {
      this.agendas = response.map((agenda: { fecha: string; }) => ({
        ...agenda,
        fecha: this.fixUTCDateToLocal(agenda.fecha)
      }));
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
    this.registrarAgenda.get('coordinador')?.setValue(nombre);
  }

  crearActividad(): FormGroup {
    return this.fb.group({
      hora: ['', Validators.required],
      domicilio: [''],
      actividad: [''],
      codigo: [''],
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
            this.refrescarAgendas();
          },
          error: (error) => {
            console.error('Error al eliminar agenda:', error);
            this.showToast('error', 'Error al eliminar la agenda');
          }
        });
      }
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

  // : Agregar métodos para obtener
  get agendasFiltradasPorCoordinador() {
    return this.agendas.filter(agenda => {
      const fecha = new Date(agenda.fecha);
      const mes = fecha.toLocaleString('es-MX', { month: 'long' });
      const dia = fecha.toLocaleString('es-MX', { weekday: 'long' });

      const semana = agenda.semana?.trim(); // Elimina espacios al inicio y final

      return (
        agenda.coordinador === this.coordinadorVisible &&
        (!this.mesSeleccionado || mes.toLowerCase() === this.mesSeleccionado.toLowerCase()) &&
        (!this.semanaSeleccionada || semana === this.semanaSeleccionada) &&
        (!this.diaSeleccionado || dia.toLowerCase() === this.diaSeleccionado.toLowerCase())
      );
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
    this.aplicarFiltros();
  }


  guardarCambios(agenda: Agenda): void {
    if (!agenda._id) return;

    this._coordinacionService.actualizarAgenda(agenda._id, {
      domicilio: agenda.domicilio,
      actividad: agenda.actividad,
      hora: agenda.hora,
      codigo: agenda.codigo,
      actividadReportada: agenda.actividadReportada,
      reportado: agenda.reportado,
      horaReporte: agenda.horaReporte,
      horaCierre: agenda.horaCierre,
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
  get totalKmRecorridos(): number {
    return +this.agendasFiltradasPorCoordinador
      .reduce((acc, curr) => acc + (curr.kmRecorrido || 0), 0)
      .toFixed(2);
  }

  get litrosGasolina(): number {
    const nombreCoordinador = this.registrarAgenda.get('coordinador')?.value;
    const rendimiento = this.rendimientosCoordinadores[nombreCoordinador] ?? RENDIMIENTO_POR_DEFECTO;
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

  get horasPagosNoReportadas(): number {
    return this.horasPagos - this.horasEntregasReportadas;
  }

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

  get horasRPNoReportadas(): number {
    return this.horasRP - this.horasRPReportadas;
  }

  //
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

  get horasCobranzasNoReportadas(): number {
    return this.horasCobranza - this.horasCobranzasReportadas;
  }


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

  get horasVentasNoReportadas(): number {
    return this.horasVentas - this.horasVentasReportadas;
  }


  get horasREC(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'E'
    ).length;
  }

  get horasRECReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'R/EC'
    ).length;
  }

  get horasRECNoReportadas(): number {
    return this.horasREC - this.horasRECReportadas;
  }

  get horasRER(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'R/ER'
    ).length;
  }

  get horashorasRERReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'R/ER'
    ).length;
  }

  get horashorasRERNoReportadas(): number {
    return this.horasRER - this.horasRER;
  }

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

  get horashorasGrupoNNoReportadas(): number {
    return this.horasGrupoN - this.horashorasGrupoNReportadas;
  }


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

  get horasSupNoReportadas(): number {
    return this.horasSup - this.horasSupReportadas;
  }




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

  get horasAtenNoReportadas(): number {
    return this.horasAten - this.horasAtenReportadas;
  }


  ///
  get horasReA(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'R/A'
    ).length;
  }

  get horasReAReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'Sup'
    ).length;
  }

  get horasReANoReportadas(): number {
    return this.horasReA - this.horasReAReportadas;
  }


  //

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

  get horasDomiciliarNoReportadas(): number {
    return this.horasDomiciliar - this.horasDomiciliarReportadas;
  }

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

  get horasSCNoReportadas(): number {
    return this.horasSC - this.horasSCReportadas;
  }


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

  get horasAMNoReportadas(): number {
    return this.horasAM - this.horasAMReportadas;
  }

  get horasOpe(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.hora && a.codigo === 'Ope'
    ).length;
  }

  get horasOpeReportadas(): number {
    return this.agendasFiltradasPorCoordinador.filter(
      a => a.horaReporte && a.reportado === true && a.codigo === 'Ope'
    ).length;
  }


  get horasProductividad(): number {
    return this.horasTrabajo > 0
      ? parseFloat(((this.horasAgendadas / this.horasTrabajo) * 100).toFixed(2))
      : 0;
  }

  opcionesCodigo = [
    { value: 'AG', texto: 'AG | Aseo General' },
    { value: 'AM', texto: 'AM | Actividades Matutinas' },
    { value: 'Aten', texto: 'Aten | Atenciones' },
    { value: 'C', texto: 'C | Cobranza' },
    { value: 'CF', texto: 'CF | Cierre de Fichas' },
    { value: 'D', texto: 'D | Domiciliar' },
    { value: 'E', texto: 'E | Desembolso o Entregas' },
    { value: 'GN', texto: 'GN | Grupo Nuevo' },
    { value: 'INT', texto: 'INT | Integración' },
    { value: 'Ope', texto: 'Ope | Env. Operativos' },
    { value: 'R', texto: 'R | Pago' },
    { value: 'R/A', texto: 'R/A | Realizando Agendas' },
    { value: 'R/EC', texto: 'R/EC | Pago/Entrega/Cambio de Ciclo' },
    { value: 'R/ER', texto: 'R/ER | Pago/Entrega/Refill' },
    { value: 'R/P', texto: 'R/P | Pago/Levantamiento de Papeleria' },
    { value: 'RS', texto: 'RS | Reunión Semanal' },
    { value: 'TS', texto: 'TS | Traslado' },
    { value: 'VTA', texto: 'VTA | Promoción' },
    { value: 'Seg', texto: 'Seg | Seguimiento' },
    { value: 'Sup', texto: 'Sup | Supervisión' },
    { value: 'Sin Codigo', texto: 'Sin codigo' },
    { value: '', texto: '' }
  ];

  // Chart methods
  mostrarGraficas(): void {
    this.mostrarContenedorGraficas = !this.mostrarContenedorGraficas;
    if (this.mostrarContenedorGraficas) {
      setTimeout(() => {
        this.dibujarGraficaPorCodigo();
        this.dibujarGraficaReporteadasVsNoReportadas();
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

    const conteoReportadas: Record<string, number> = {};
    const conteoNoReportadas: Record<string, number> = {};

    // Inicializar conteos
    this.opcionesCodigo.forEach(opcion => {
      conteoReportadas[opcion.texto] = 0;
      conteoNoReportadas[opcion.texto] = 0;
    });

    // Contar actividades
    this.agendasFiltradasPorCoordinador.forEach(a => {
      const codigoTexto = this.opcionesCodigo.find(o => o.value === a.codigo)?.texto;
      if (!codigoTexto) return;

      if (a.reportado) {
        conteoReportadas[codigoTexto]++;
      } else {
        conteoNoReportadas[codigoTexto]++;
      }
    });

    const etiquetas = this.opcionesCodigo.map(o => o.texto);
    const datosReportadas = etiquetas.map(et => conteoReportadas[et]);
    const datosNoReportadas = etiquetas.map(et => conteoNoReportadas[et]);

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
            backgroundColor: '#4caf50'
          },
          {
            label: 'No Reportadas',
            data: datosNoReportadas,
            backgroundColor: '#f44336'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: 'Agendas por Código (Reportadas vs No Reportadas)'
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value,
            font: {
              weight: 'bold',
              size: 10
            }
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
