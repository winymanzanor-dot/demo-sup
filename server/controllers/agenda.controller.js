// Importa el modelo de Agenda desde la ruta especificada
const Agenda = require('../models/Agenda');

/**
 * Controlador para registrar una nueva agenda
 * Función: Crea y guarda una nueva entrada en la agenda
 * @param {Object} req - Objeto de solicitud con datos en el body
 * @param {Object} res - Objeto de respuesta
 */
exports.registrarAgenda = async (req, res) => {
  try {
    // Extrae todos los datos del cuerpo de la solicitud usando spread operator
    const { ...datosAgenda } = req.body;

    // Crea una nueva instancia del modelo Agenda con los datos recibidos
    const nuevaAgenda = new Agenda({
      ...datosAgenda
    });

    // Guarda la nueva agenda en la base de datos
    const agendaGuardada = await nuevaAgenda.save();

    // Responde con éxito (201 Created) y los datos guardados
    res.status(201).json({
      mensaje: 'Agenda registrada correctamente',
      agenda: agendaGuardada,
    });

  } catch (error) {
    console.error('Error al crear agenda y domicilio:', error);
    res.status(500).json({ mensaje: 'Hubo un error al crear la agenda y domicilio' });
  }
};


/**
 * Controlador para obtener agendas con paginación y campos específicos
 * Función: Recupera agendas con soporte para paginación y selección de campos
 * @param {Object} req - Solicitud con parámetros de paginación (page, limit)
 * @param {Object} res - Respuesta con datos paginados
 */
exports.obtenerAgendas1 = async (req, res) => {
  try {
    // Obtiene parámetros de paginación con valores por defecto
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 315;
    const skip = (page - 1) * limit;

    // Define los campos que se devolverán en la respuesta
    const projection = {
      _id: 1,
      semana: 1, 
      coordinador: 1,
      fecha: 1,
      hora: 1,
      actividad: 1,
      codigo: 1,
      codigoReportado: 1,
      actividadReportada: 1,
      reportado: 1,
      horaReporte: 1,
      horaCierre: 1,
      kmRecorrido: 1,
      cumplimientoAgenda: 1,
      domicilio: 1,
      acordeObjetivo: 1
    };

    // Ejecuta consultas paralelas para obtener datos y total
    const [agendas, total] = await Promise.all([
      // Consulta con paginación, ordenamiento y selección de campos
      Agenda.find({}, projection)
        .sort({ fecha: 1, hora: 1 }) // Orden ascendente por fecha y hora
        .skip(skip)
        .limit(limit)
        .lean(), // Devuelve objetos JavaScript simples
      
      // Cuenta el total de documentos
      Agenda.countDocuments()
    ]);

    // Responde con datos paginados y metadatos
    res.status(200).json({
      agendas,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error al obtener agendas:', error);
    res.status(500).json({ mensaje: 'Hubo un error al obtener las agendas' });
  }
};

/**
 * Controlador para obtener todas las agendas sin paginación
 * Función: Recupera todas las agendas completas (sin selección de campos)
 * @param {Object} req - Solicitud
 * @param {Object} res - Respuesta con todas las agendas
 */
exports.obtenerAgenda = async (req, res) => {
  try {
    // Obtiene todas las agendas ordenadas por fecha y hora ascendente
    const agendas = await Agenda.find()
      .sort({ fecha: 1, hora: 1 });

    res.status(200).json(agendas);
  } catch (error) {
    console.error('Error al obtener agendas:', error);
    res.status(500).json({ mensaje: 'Hubo un error al obtener las agendas' });
  }
};

/**
 * Controlador para actualizar una agenda existente
 * Función: Modifica los datos de una agenda específica
 * @param {Object} req - Solicitud con ID en params y datos en body
 * @param {Object} res - Respuesta con la agenda actualizada
 */
exports.actualizarAgenda = async (req, res) => {
  console.info('Seguimiento Agenda');

  try {
    const { id } = req.params;
    // Extrae campos específicos para actualización
    const { fecha, hora, domicilio, codigo, codigoReportado, actividadReportada, 
            reportado, horaReporte, horaCierre, cumplimientoAgenda, kmRecorrido, acordeObjetivo } = req.body;

    // Busca y actualiza la agenda por ID
    const agendaActualizada = await Agenda.findByIdAndUpdate(
      id,
      { fecha, hora, domicilio, codigo, codigoReportado, actividadReportada, 
        reportado, horaReporte, horaCierre, cumplimientoAgenda, kmRecorrido, acordeObjetivo },
      { new: true } // Devuelve el documento actualizado
    );

    if (!agendaActualizada) {
      return res.status(404).json({ msg: 'No se ha registrado esta agenda.' });
    }

    res.json(agendaActualizada);
  } catch (error) {
    console.error('Error al actualizar la agenda:', error);
    res.status(500).send('Hubo un error');
  }
};

/**
 * Controlador para eliminar una agenda
 * Función: Elimina permanentemente una agenda de la base de datos
 * @param {Object} req - Solicitud con ID en params
 * @param {Object} res - Respuesta de confirmación
 */
exports.eliminarAgenda = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica si la agenda existe antes de eliminar
    const agenda = await Agenda.findById(id);

    if (!agenda) {
      return res.status(404).json({ mensaje: 'Agenda no encontrada' });
    }

    // Elimina la agenda
    await Agenda.findByIdAndDelete(id);

    res.status(200).json({ mensaje: 'Agenda eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la agenda:', error);
    res.status(500).json({ mensaje: 'Hubo un error al eliminar la agenda' });
  }
};
