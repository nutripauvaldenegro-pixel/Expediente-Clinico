export const REGLAS_CLASIFICACION = {
  "Atencion Medica": [
    { token: "anamnesis", peso: 4 },
    { token: "motivo de consulta", peso: 5 },
    { token: "examen fisico", peso: 4 },
    { token: "diagnostico", peso: 3 },
    { token: "evolucion", peso: 4 }
  ],
  "Reserva de Hora": [
    { token: "reserva", peso: 5 },
    { token: "cita", peso: 4 },
    { token: "agendada", peso: 4 },
    { token: "confirmacion de hora", peso: 5 },
    { token: "hora medica", peso: 4 }
  ],
  "Resultado de Examen": [
    { token: "resultado", peso: 4 },
    { token: "valores de referencia", peso: 5 },
    { token: "rango normal", peso: 4 },
    { token: "conclusiones", peso: 3 },
    { token: "hallazgos", peso: 3 }
  ],
  "Orden de Examen": [
    { token: "orden medica", peso: 5 },
    { token: "solicita examen", peso: 5 },
    { token: "deriva a", peso: 4 },
    { token: "ruego evaluar", peso: 3 },
    { token: "interconsulta", peso: 4 }
  ],
  "Tratamiento": [
    { token: "plan de tratamiento", peso: 5 },
    { token: "indicaciones", peso: 4 },
    { token: "terapia", peso: 4 },
    { token: "kinesiologia", peso: 3 },
    { token: "sesiones", peso: 3 }
  ],
  "Informe": [
    { token: "informe medico", peso: 5 },
    { token: "epicrisis", peso: 5 },
    { token: "resumen clinico", peso: 5 },
    { token: "alta medica", peso: 4 }
  ],
  "Certificado": [
    { token: "certificado", peso: 5 },
    { token: "certifica", peso: 4 },
    { token: "reposo medico", peso: 5 },
    { token: "licencia", peso: 4 },
    { token: "para ser presentado", peso: 4 }
  ],
  "Receta": [
    { token: "receta", peso: 5 },
    { token: "rp", peso: 4 },
    { token: "tomar", peso: 2 },
    { token: "cada 8 horas", peso: 3 },
    { token: "comprimidos", peso: 3 }
  ]
};

const UMBRAL_CLASIFICACION = 8;

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
