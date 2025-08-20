import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaFormat',
  standalone: false
})
export class FechaFormatPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return '';
    
    // Asume que el valor viene en formato ISO (aaaa-mm-dd) o similar
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convierte a dd-mm-aaaa
    }
    
    // Si ya está en formato dd-mm-aaaa, déjalo igual
    return value;
  }

}
