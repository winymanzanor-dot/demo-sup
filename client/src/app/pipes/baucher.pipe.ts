import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'baucher',
  standalone: false
})
export class BaucherPipe implements PipeTransform {
  transform(value: any[], arg: string): any[] {
    if (!arg || arg.trim().length < 1 || !Array.isArray(value)) return value;

    const searchTerm = arg.toLowerCase();

    return value.filter(rbaucher =>
      [
        rbaucher.coordinacion?.nombre,
        rbaucher.ejecutiva,
        rbaucher.coordinador,
        rbaucher.fechaBaucher,
        rbaucher.fechaReporte,
        rbaucher.grupo,
        rbaucher.concepto,
        rbaucher.titular,
        rbaucher.fechaCreacion
      ]
        .filter(Boolean)
        .some(field => field.toString().toLowerCase().includes(searchTerm))
    );
  }
}
