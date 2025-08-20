// Importa la librería bcrypt para el hashing de contraseñas
const bcrypt = require('bcrypt');
// Importa la librería jsonwebtoken para crear tokens de autenticación
const jwt = require('jsonwebtoken');
// Importa el modelo de Usuario desde la ruta especificada
const Usuario = require('../models/Usuario'); 

// Importa Variables de entorno para APIKEY
const SECRET_KEY = process.env.SECRET_KEY || 'demo123!!';

/**
 * Controlador para registrar un nuevo usuario
 * Función: Crea una nueva cuenta de usuario en el sistema
 * @param {Object} req - Objeto de solicitud con datos del usuario
 * @param {Object} res - Objeto de respuesta
 */
exports.registrarUsuario = async (req, res) => {
  // Extrae los datos del cuerpo de la solicitud
  const { usuario, contrasenia, rol } = req.body;

  try {
    // Verifica si el usuario ya existe en la base de datos
    const usuarioExistente = await Usuario.findOne({ usuario });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El usuario ya existe' });
    }

    // Genera el hash de la contraseña con salt rounds = 10
    const hash = await bcrypt.hash(contrasenia, 10);

    // Crea una nueva instancia del modelo Usuario
    const nuevoUsuario = new Usuario({
      usuario,
      contrasenia: hash, // Guarda el hash en lugar de la contraseña en texto plano
      rol
    });

    // Guarda el nuevo usuario en la base de datos
    await nuevoUsuario.save();

    // Responde con éxito (201 Created)
    res.status(201).json({ mensaje: 'Usuario registrado correctamente' });
  } catch (error) {
    // Maneja errores del servidor
    res.status(500).json({ mensaje: 'Error en el servidor', error });
  }
};

/**
 * Controlador para iniciar sesión
 * Función: Autentica un usuario y genera un token JWT
 * @param {Object} req - Objeto de solicitud con credenciales
 * @param {Object} res - Objeto de respuesta con token y datos de usuario
 */
exports.iniciarSesion = async (req, res) => {
  // Extrae las credenciales del cuerpo de la solicitud
  const { usuario, contrasenia } = req.body;

  try {
    // Busca el usuario en la base de datos
    const usuarioEncontrado = await Usuario.findOne({ usuario });
    
    // Si el usuario no existe, retorna error de credenciales
    if (!usuarioEncontrado) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Compara la contraseña proporcionada con el hash almacenado
    const passwordValida = await bcrypt.compare(contrasenia, usuarioEncontrado.contrasenia);
    
    // Si la contraseña no coincide, retorna error de credenciales
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Genera un token JWT con los datos del usuario
    const token = jwt.sign(
      { 
        id: usuarioEncontrado._id, // ID del usuario
        rol: usuarioEncontrado.rol // Rol del usuario
      },
      SECRET_KEY, // Clave secreta para firmar el token
      { expiresIn: '2h' } // El token expira en 2 horas
    );

    // Responde con éxito incluyendo el token y datos del usuario
    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token, // Token JWT para autenticación futura
      usuario: usuarioEncontrado.usuario, // Nombre de usuario
      rol: usuarioEncontrado.rol // Rol del usuario
    });
  } catch (error) {
    // Maneja errores del servidor
    res.status(500).json({ mensaje: 'Error en el servidor', error });
  }
};