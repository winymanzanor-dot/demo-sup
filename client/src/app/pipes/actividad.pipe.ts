import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'actividad',
  standalone: false
})
export class ActividadPipe implements PipeTransform {

 transform(value: any, arg: any): any {
    
    if (arg === '' || arg.length < 3) return value;
    const resultadoAgenda = [];
    for (const agenda of value) {
      if (agenda.semana.toLowerCase().indexOf(arg.toLowerCase()) > -1) {
        resultadoAgenda.push(agenda);
      } else if (agenda.actividad.toLowerCase().indexOf(arg.toLowerCase()) > -1) {
        resultadoAgenda.push(agenda);
      } else if (agenda.fecha.toLowerCase().indexOf(arg.toLowerCase()) > -1) {
        resultadoAgenda.push(agenda);
      } else if (agenda.codigo.toLowerCase().indexOf(arg.toLowerCase()) > -1) {
        resultadoAgenda.push(agenda);
      } 
    };
    return resultadoAgenda;
  }
}
