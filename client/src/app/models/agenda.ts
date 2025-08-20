export interface Agenda {
    _id?: string;
    semana: string;
    coordinador: string;
    fecha?: string;
    objetivo?: string;
    meta?: string;
    hora: string;
    domicilio?: string;
    actividad?: string;
    codigo?: string;
    codigoReportado?: string;
    actividadReportada?: string;
    reportado?: boolean;
    horaReporte?: string;
    horaCierre?: string;
    traslado?: string;
    kmRecorrido?: number;
    cumplimientoAgenda?: boolean;
    acordeObjetivo?: boolean;
  }
  

  export interface Domicilio {
  _id: string;
  nombre: string;
}
