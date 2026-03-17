export const REGLAS_CLASIFICACION = {
  "Cardiologia": [
    { token: "electrocardiograma", peso: 5 },
    { token: "ritmo sinusal", peso: 5 },
    { token: "arritmia", peso: 4 },
    { token: "ecocardiograma", peso: 4 },
    { token: "mg/dl", peso: -2 }
  ],
  "Laboratorio": [
    { token: "mg/dl", peso: 3 },
    { token: "hemograma", peso: 4 },
    { token: "glucosa", peso: 3 },
    { token: "colesterol", peso: 3 },
    { token: "trigliceridos", peso: 3 }
  ],
  "Radiologia": [
    { token: "radiografia", peso: 5 },
    { token: "rayos x", peso: 5 },
    { token: "resonancia", peso: 4 },
    { token: "tomografia", peso: 4 },
    { token: "fractura", peso: 3 }
  ],
  "Receta Medica": [
    { token: "rx", peso: 3 },
    { token: "tomar", peso: 2 },
    { token: "cada 8 horas", peso: 3 },
    { token: "mg", peso: 1 },
    { token: "comprimidos", peso: 3 }
  ]
};

const UMBRAL_CLASIFICACION = 10;

export const clasificarDocumento = (textoNormalizado) => {
  const puntuaciones = {};

  // Inicializar puntuaciones
  for (const categoria in REGLAS_CLASIFICACION) {
    puntuaciones[categoria] = 0;
  }

  // Evaluar reglas
  for (const [categoria, reglas] of Object.entries(REGLAS_CLASIFICACION)) {
    for (const regla of reglas) {
      // Contar ocurrencias del token en el texto normalizado
      const regex = new RegExp(`\\b${regla.token.toLowerCase()}\\b`, 'g');
      const coincidencias = (textoNormalizado.match(regex) || []).length;

      if (coincidencias > 0) {
        puntuaciones[categoria] += (regla.peso * coincidencias);
      }
    }
  }

  // Encontrar la categoría con mayor puntuación que supere el umbral
  let categoriaSugerida = "Desconocido/Pendiente";
  let maxPuntuacion = -Infinity;

  for (const [categoria, puntuacion] of Object.entries(puntuaciones)) {
    if (puntuacion > maxPuntuacion && puntuacion >= UMBRAL_CLASIFICACION) {
      maxPuntuacion = puntuacion;
      categoriaSugerida = categoria;
    }
  }

  return {
    categoria: categoriaSugerida,
    puntuaciones,
    esAmbigua: categoriaSugerida === "Desconocido/Pendiente"
  };
};
