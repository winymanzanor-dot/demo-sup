import { Component, OnInit } from '@angular/core';
import { Baucher } from '../../../models/baucher';
import { PagosService } from '../../../services/pagos.service';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion, Persona } from '../../../models/coordinacion';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { BaucherPipe } from '../../../pipes/baucher.pipe';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-bauchers',
  standalone: false,
  templateUrl: './bauchers.component.html',
  styleUrl: './bauchers.component.css',
  providers: [BaucherPipe]

})
export class BauchersComponent implements OnInit{
  reporteResumen: any;
  grafica: any; // referencia al chart


  getPages(): any {
  throw new Error('Method not implemented.');
  }
  listarBauchers: any[] = []; // Cambiado a any[] para incluir la coordinación.
  filtrarBaucher = '';
  coordinaciones: Coordinacion[] = [];  // Asegúrate de que coordinaciones sea de tipo Coordinacion[]
  baucherForm: FormGroup;
  personasFiltradas: Persona[] = [];
  fechaFiltro: string = ''; // formato 'YYYY-MM-DD'
  bauchersTemporales: Baucher[] = [];


  currentPage: number = 1;
  itemsPerPage: number = 25; // número de bauchers por página
  /**EDITAR*/
  // Añade estas nuevas propiedades
  editingBaucherId: string | null = null;
  isEditing = false;


  constructor(
    private fb: FormBuilder,
    private _pagosService: PagosService,
    private _coordinacionService: CoordinacionService, 
    private baucherPipe: BaucherPipe) {
      this.baucherForm = this.fb.group({
        coordinacion: ['', Validators.required],
        ejecutiva: ['', Validators.required],
        vouchers: this.fb.array([this.crearVouchers()])
      });      
    }

    get filteredBauchers() {
      let bauchersFiltrados = this.baucherPipe.transform(this.listarBauchers, this.filtrarBaucher);

      if (this.fechaFiltro) {
        bauchersFiltrados = bauchersFiltrados.filter(baucher => {
          const fechaCreacion = new Date(baucher.fechaCreacion).toISOString().slice(0, 10);
          return fechaCreacion === this.fechaFiltro;
        });
      }

      return bauchersFiltrados;
    }

    get paginatedBauchers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredBauchers.slice(start, end);
    }

    cambiarPagina(pagina: number) {
      this.currentPage = pagina;
    }
  
    get totalPages() {
      return Math.ceil(this.listarBauchers.length / this.itemsPerPage);
    }
    changePage(page: number) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    }
      

  filtrarPorFecha() {
  this.currentPage = 1;
}

    filtrarPersonas() {
      const coord: Coordinacion = this.baucherForm.get('coordinacion')?.value;
      if (coord) {
        this.personasFiltradas = [
          ...(coord.ejecutivas || []).map(e => ({ ...e, tipo: 'Ejecutiva' })),
          ...(coord.coordinador || []).map(c => ({ ...c, tipo: 'Coordinador' }))
        ];
        
        this.baucherForm.get('ejecutiva')?.setValue(null); // Resetea la selección
      } else {
        this.personasFiltradas = [];
      }
    }

    

    ngOnInit(): void {
      this.obtenerBauchers();
      this._coordinacionService.obtenerCoordinacion().subscribe(data => {
        this.coordinaciones = data;
      });
    }
    crearVouchers(): FormGroup {
      return this.fb.group({
        fechaBaucher: [''],
        fechaReporte: ['', Validators.required],
        grupo: [''],
        concepto: [''],
        titular: ['']
      });
    }

    get vouchers(): FormArray {
      return this.baucherForm.get('vouchers') as FormArray;
    }

    agregarVoucher(): void {
      this.vouchers.push(this.crearVouchers());
    }

  eliminarVoucher(index: number): void {
    this.vouchers.removeAt(index);
  }

  // Método corregido para cargar datos para edición
      cargarBaucherParaEditar(baucher: any) {
        this.isEditing = true;
        this.editingBaucherId = baucher._id;
        
        // Limpiar los vouchers existentes
        while (this.vouchers.length) {
          this.vouchers.removeAt(0);
        }

        // 1. Primero cargar la coordinación
        const coordinacionCompleta = this.coordinaciones.find(
          c => c._id === baucher.coordinacion._id || c._id === baucher.coordinacion
        );

        // 2. Establecer la coordinación en el formulario
        this.baucherForm.patchValue({
          coordinacion: coordinacionCompleta
        });

        // 3. Filtrar personas para esta coordinación
        this.filtrarPersonas();

        // 4. Buscar la persona después de que las personasFiltradas estén cargadas
        setTimeout(() => {
          const persona = this.personasFiltradas.find(
            p => p._id === (baucher.ejecutiva?._id || baucher.coordinador?._id) || 
                p.nombre === (baucher.ejecutiva?.nombre || baucher.coordinador?.nombre)
          );

          // 5. Establecer la persona en el formulario
          this.baucherForm.patchValue({
            ejecutiva: persona
          });

          // 6. Crear y cargar el voucher
          const voucherGroup = this.crearVouchers();
          voucherGroup.patchValue({
            fechaBaucher: this.formatDateForInput(baucher.fechaBaucher),
            fechaReporte: this.formatDateForInput(baucher.fechaReporte),
            grupo: baucher.grupo,
            concepto: baucher.concepto,
            titular: baucher.titular
          });
          
          this.vouchers.push(voucherGroup);
        }, 100);
      }


      // Método mejorado para formatear fechas
      private formatDateForInput(dateString: string): string {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        // Ajustar para el desfase de zona horaria
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() - timezoneOffset);
        
        return adjustedDate.toISOString().slice(0, 16);
      }

    // Método agregarBaucher corregido
    async agregarBaucher(): Promise<void> {
      if (this.baucherForm.valid) {
        try {
          const formValue = this.baucherForm.value;
          const coordinacionSeleccionada = formValue.coordinacion;
          const ejecutivaSeleccionada = formValue.ejecutiva;

          for (const voucher of formValue.vouchers) {
            const baucherData: Baucher = {
              coordinacion: coordinacionSeleccionada._id,
              ejecutiva: ejecutivaSeleccionada?.tipo === 'Ejecutiva' ? ejecutivaSeleccionada.nombre : undefined,
              coordinador: ejecutivaSeleccionada?.tipo === 'Coordinador' ? ejecutivaSeleccionada.nombre : undefined,
              fechaBaucher: voucher.fechaBaucher,
              fechaReporte: voucher.fechaReporte,
              grupo: voucher.grupo,
              concepto: voucher.concepto,
              titular: voucher.titular
            };

            if (this.editingBaucherId) {
              await this.actualizarBaucher(baucherData);
            } else {
              await this.crearNuevoBaucher(baucherData);
            }
          }

          this.resetForm();
          this.vouchers.clear();
          this.vouchers.push(this.crearVouchers());
          this.obtenerBauchers();
          this.isEditing = false;
          this.editingBaucherId = null;
        } catch (error) {
          this.mostrarError();
        }
      }
    }

  private async crearNuevoBaucher(baucherData: Baucher) {
    await this._pagosService.agregarBaucher(baucherData).toPromise();
    this.mostrarExito('Guardado exitosamente');
    this.vouchers.push(this.crearVouchers())
  }

  private async actualizarBaucher(baucherData: Baucher) {
    if (!this.editingBaucherId) return;
    
    await this._pagosService.actualizarBaucher(this.editingBaucherId, baucherData).toPromise();
    this.mostrarExito('Actualizado exitosamente');
  }

  resetForm(mantenerCabecera = true): void {
    const coord = this.baucherForm.get('coordinacion')?.value;
    const ejecutiva = this.baucherForm.get('ejecutiva')?.value;

    this.baucherForm.reset();
    this.isEditing = false;
    this.editingBaucherId = null;

    if (mantenerCabecera) {
      this.baucherForm.patchValue({
        coordinacion: coord,
        ejecutiva: ejecutiva
      });
    }
  }

  private mostrarExito(mensaje: string) {
    Swal.fire({
      icon: 'success',
      title: mensaje,
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  private mostrarError() {
    Swal.fire({
      icon: 'error',
      title: 'Error en la operación',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }


  obtenerBauchers() {
    this._pagosService.obtenerBauchers().subscribe(data => {
      console.log(data);
      this.listarBauchers = data.map(baucher => {
        // Busca el nombre de la coordinación en base al _id de la coordinación.
        const coordinacion = this.coordinaciones.find(co => co._id === baucher.coordinacion);
        return {
          ...baucher,
          coordinacionNombre: coordinacion ? coordinacion.nombre : 'Desconocida'
        };
      });
    }, error => {
      console.log(error);
    });
  }

  eliminarBaucher(id: any) {
    Swal.fire({
      title: "¿Estás seguro de querer eliminar este registro?",
      text: "Esta acción no puede ser revertida",
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, estoy seguro."
    }).then((result) => {
      if (result.isConfirmed) {
        // Si el usuario confirma, entonces llama a eliminarUsuario
        this._pagosService.eliminarBaucher(id).subscribe(
          data => {
            Swal.fire({
              title: "Eliminado",
              text: "Esta agenda ha sido eliminado.",
              icon: "success"
            });
            // Llama a obtenerUsuarios1 después de eliminar exitosamente
            this.obtenerBauchers();
          },
          error => {
            console.log(error);
          }
        );
      }
    });
  }
  

  exportarExcel(): void {
    const headers = [
      'Coordinación', 'Responsable', 'Fecha Pago', 'Hora Pago',
      'Fecha Reporte', 'Hora Reporte', 'Diferencia',
      'Grupo', 'Concepto', 'Observaciones'
    ];

    const body = this.filteredBauchers.map(b => ([
      b.coordinacion?.nombre,
      b.ejecutiva || b.coordinador,
      this.formatearFecha(b.fechaBaucher),
      this.formatearHora(b.fechaBaucher),
      this.formatearFecha(b.fechaReporte),
      this.formatearHora(b.fechaReporte),
      b.diasDiferencia,
      b.grupo,
      b.concepto,
      b.titular
    ]));

    const data = [headers, ...body];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Aplicar estilos condicionales a la columna "Diferencia" (índice 6)
    const diferenciaCol = 6;
    body.forEach((row, i) => {
      const rowIndex = i + 2; // +2 porque AOA incluye encabezado y Excel es 1-indexed
      const cellRef = XLSX.utils.encode_cell({ c: diferenciaCol, r: rowIndex - 1 });
      const dias = row[diferenciaCol];

      let fillColor = '';
      if (dias > 3) fillColor = 'FFDC3545'; // rojo (danger)
      else if (dias > 1) fillColor = 'FFFFC107'; // amarillo (warning)
      else fillColor = 'FF198754'; // verde (success)

      if (!worksheet[cellRef]) return;

      worksheet[cellRef].s = {
        fill: {
          fgColor: { rgb: fillColor }
        },
        font: {
          color: { rgb: 'FFFFFFFF' },
          bold: true
        },
        alignment: {
          horizontal: 'center'
        }
      };
    });

    // Crear el libro
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Bauchers': worksheet },
      SheetNames: ['Bauchers']
    };

    // Guardar
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      cellStyles: true
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, 'bauchers_condicional.xlsx');
  }



  get vouchersTotales(): number {
    return this.listarBauchers.filter(a => a.coordinacion).length;
  }

  formatearFecha(fecha: string | Date): string {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  formatearHora(fecha: string | Date): string {
    const f = new Date(fecha);
    return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  // Método para generar datos del reporte
  generarDatosReporte() {
    const datos: any[] = [];

    const agrupado = this.listarBauchers.reduce((acc, baucher) => {
      const key = baucher.ejecutiva || baucher.coordinador || 'Desconocido';
      if (!acc[key]) {
        acc[key] = {
          responsable: key,
          totalTitulares: 0,
          totalVouchers: 0,
          diasAtraso: 0,
          coordinacion: baucher.coordinacion?.nombre || 'Desconocida'
        };
      }

      acc[key].totalVouchers++;
      if (baucher.titular && baucher.titular.trim() !== '') {
        acc[key].totalTitulares++;
      }
      if (baucher.diasDiferencia > 0) {
        acc[key].diasAtraso += baucher.diasDiferencia;
      }

      return acc;
    }, {});

    this.reporteResumen = Object.values(agrupado)
      .sort((a: any, b: any) => b.totalVouchers - a.totalVouchers)
      .slice(0, 10);

    this.generarGrafica();
    this.generarGraficaAtraso(); 

  }

  generarGrafica() {
  const labels = this.reporteResumen.map((r: { responsable: any; }) => r.responsable);
  const data = this.reporteResumen.map((r: { totalVouchers: any; }) => r.totalVouchers);

  if (this.grafica) {
    this.grafica.destroy(); // Evitar duplicados si se vuelve a generar
  }

  this.grafica = new Chart('graficaVouchers', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total de Vouchers',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

  graficaAtraso: any;

  generarGraficaAtraso() {
    const responsablesConAtraso = this.reporteResumen.filter((r: { diasAtraso: number; }) => r.diasAtraso > 0);

    const labels = responsablesConAtraso.map((r: { responsable: any; }) => r.responsable);
    const data = responsablesConAtraso.map((r: { diasAtraso: any; }) => r.diasAtraso);

    if (this.graficaAtraso) {
      this.graficaAtraso.destroy(); // Elimina la anterior si existe
    }

    this.graficaAtraso = new Chart('graficaAtraso', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Días de Atraso',
          data: data,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Personas con días de atraso en el envío de vouchers'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Método mejorado para descargar PDF
  async descargarPDF() {
    // Generar datos actualizados
    this.generarDatosReporte();
    
    // Esperar un ciclo de detección de cambios
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const contenido = document.getElementById('contenidoReporte');
    if (!contenido) return;

    try {
      // Mostrar loading
      Swal.fire({
        title: 'Generando PDF',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getDenyButton());
        }
      });

      // Configuración de html2canvas
      const canvas = await html2canvas(contenido, {
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20; // Margen
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Agregar título y fecha
      pdf.setFontSize(18);
      pdf.text('Reporte de Vouchers', 105, 15, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

      // Agregar imagen del contenido
      pdf.addImage(imgData, 'PNG', 10, 30, pdfWidth, pdfHeight);

      // Guardar PDF
      pdf.save(`reporte_vouchers_${new Date().toISOString().slice(0, 10)}.pdf`);

      // Cerrar loading
      Swal.close();
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el PDF', 'error');
      console.error('Error al generar PDF:', error);
    }
  }
    
}