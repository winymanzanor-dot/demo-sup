const mongoose = require('mongoose');

const coordinacionSchema = new mongoose.Schema({
  nombre: String,
  municipio: String,
  ejecutivas: [
    {
      nombre: String //Una coordinacion puede tener una o mas ejecutivas
    }
  ],
  coordinador: [{ 
    nombre: String,
    coche: String,
    rendimiento: Number 
  }] 
});

module.exports = mongoose.model('Coordinacion', coordinacionSchema);
