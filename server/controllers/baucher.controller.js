const Baucher = require('../models/Baucher');

// Controlador para obtener todos los bauchers, incluyendo el nombre de la coordinación
 exports.obtenerBauchers = async (req, res) => {
  try {
    const bauchers = await Baucher.find()
      .populate('coordinacion') // Solo traer el campo 'coordinacion' de la colección Coordinacion
      .sort({ fechaCreacion: -1 });

    res.status(200).json(bauchers);
  } catch (error) {
    console.error('Error al obtener los bauchers:', error);
    res.status(500).json({ mensaje: 'Error al obtener los bauchers' });
  }
};

// Crear un nuevo baucher
 exports.crearBaucher = async (req, res) => {
  try {
    const {
      coordinacion,
      ejecutiva,
      coordinador,
      fechaBaucher,
      fechaReporte,
      grupo,
      concepto,
      titular
    } = req.body;

    // Validación mínima requerida
    if (!fechaReporte) {
      return res.status(400).json({ mensaje: 'El campo fechaReporte es obligatorio' });
    }

    const calcularDiasDiferencia = (fecha1, fecha2) => {
      if (!fecha1 || !fecha2) return null;

      const f1 = new Date(fecha1);
      const f2 = new Date(fecha2);

      // Eliminar la parte de la hora (convertir a medianoche)
      f1.setHours(0, 0, 0, 0);
      f2.setHours(0, 0, 0, 0);

      const diffTime = f1 - f2;
      return Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    };


    // Instancia del nuevo baucher
    const nuevoBaucher = new Baucher({
      coordinacion: coordinacion || '',
      ejecutiva: ejecutiva || '',
      coordinador: coordinador || '',
      fechaBaucher: fechaBaucher ? new Date(fechaBaucher) : null,
      fechaReporte: new Date(fechaReporte),
      grupo: grupo || '',
      concepto: concepto || '',
      titular: titular || '',
      diasDiferencia: calcularDiasDiferencia(fechaReporte, fechaBaucher),
      fechaCreacion: new Date() // fecha Actual de creación de Voucher.

    });

    // Guardar en base de datos
    await nuevoBaucher.save();

    res.status(201).json({
      mensaje: 'Baucher guardado correctamente',
      baucher: nuevoBaucher
    });

  } catch (error) {
    console.error('Error al guardar el Baucher:', error);
    console.log('REQ BODY:', req.body);
    res.status(500).json({ mensaje: 'Error al guardar el Baucher' });
  }
};

// Actualizar baucher
 exports.actualizarBaucher = async (req, res) =>{
  try {
    //Datos editables
    const {coordinacion, ejecutiva, coordinador, fechaBaucher, fechaReporte, grupo, concepto, titular, diasDiferencia} = req.body;
    let rbaucher = await Baucher.findById(req.params.id);
    if(!rbaucher){
      res.status(404).json({msg: 'No existe'})
    }

    rbaucher.coordinacion = coordinacion;
    rbaucher.ejecutiva = ejecutiva;
    rbaucher.coordinador = coordinador;
    rbaucher.fechaBaucher = fechaBaucher;
    rbaucher.fechaReporte = fechaReporte;
    rbaucher.grupo = grupo;
    rbaucher.concepto = concepto;
    rbaucher.titular = titular;
    rbaucher.diasDiferencia = diasDiferencia;

    rbaucher = await Baucher.findOneAndUpdate({_id: req.params.id}, rbaucher, {new: true})
    res.json(rbaucher);
  } catch(error){
    console.log(error);
    res.status(500).send('Hubo un error');
  }
}

// Eliminar baucher
 exports.eliminarBaucher = async (req, res) => {
  try {
    let rbaucher = await Baucher.findById(req.params.id);
    if(!rbaucher){
      res.status(404).json({msg: 'No existe el registro'})
    }
    await Baucher.findOneAndDelete({ _id: req.params.id })
        res.json({msg: 'Baucher eliminado con exito'});
  }
  catch (error) {
    console.log(error);
    res.status(500).send('Hubo un error');
}
}
