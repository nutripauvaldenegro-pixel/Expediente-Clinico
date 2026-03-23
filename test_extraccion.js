import { extraerFechaPrincipal } from './sigem/src/services/extraccion.js';

console.log("=== INICIANDO PRUEBA DE EXTRACCIÓN ===");

const textoConFecha = "El paciente fue evaluado el 12/05/2023 por dolor de cabeza.";

try {
  // Simulando lo que ocurre en dbServices.js: ocrResult.coordenadas es undefined
  const fechaStr = extraerFechaPrincipal(textoConFecha, undefined);
  console.log("✅ ÉXITO: La función se ejecutó correctamente sin arrojar error 'find' of undefined.");
  console.log("Fecha extraída:", fechaStr);
} catch (error) {
  console.error("❌ ERROR: La función arrojó una excepción.");
  console.error(error);
  process.exit(1);
}
