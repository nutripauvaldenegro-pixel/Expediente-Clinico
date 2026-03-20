export const REGLAS_CLASIFICACION = {
  "Atencion Medica": [
    { token: "anamnesis", peso: 4 },
    { token: "motivo de consulta", peso: 5 },
    { token: "examen fisico", peso: 4 },
    { token: "diagnostico", peso: 3 },
    { token: "evolucion", peso: 4 },
    { token: "sintomatologia", peso: 4 },
    { token: "tratamiento", peso: 3 },
    { token: "paciente", peso: 2 },
    { token: "atencion medica", peso: 6 },
    { token: "sapu", peso: 6 },
    { token: "atencion de urgencia", peso: 6 },
    { token: "signos vitales", peso: 4 }
  ],
  "Reserva de Hora": [
    { token: "reserva", peso: 5 },
    { token: "cita", peso: 4 },
    { token: "agendada", peso: 4 },
    { token: "confirmacion de hora", peso: 5 },
    { token: "hora medica", peso: 4 },
    { token: "fecha de atencion", peso: 4 }
  ],
  "Resultado de Examen": [
    { token: "resultado", peso: 4 },
    { token: "valores de referencia", peso: 5 },
    { token: "rango normal", peso: 4 },
    { token: "conclusiones", peso: 3 },
    { token: "hallazgos", peso: 3 },
    { token: "informe de laboratorio", peso: 5 },
    { token: "parametros", peso: 3 }
  ],
  "Orden de Examen": [
    { token: "orden medica", peso: 5 },
    { token: "solicita examen", peso: 5 },
    { token: "deriva a", peso: 4 },
    { token: "ruego evaluar", peso: 3 },
    { token: "interconsulta", peso: 4 },
    { token: "procedimientos", peso: 3 }
  ],
  "Tratamiento": [
    { token: "plan de tratamiento", peso: 5 },
    { token: "indicaciones", peso: 4 },
    { token: "terapia", peso: 4 },
    { token: "kinesiologia", peso: 3 },
    { token: "sesiones", peso: 3 },
    { token: "tratamiento farmacologico", peso: 5 }
  ],
  "Informe": [
    { token: "informe medico", peso: 5 },
    { token: "epicrisis", peso: 5 },
    { token: "resumen clinico", peso: 5 },
    { token: "alta medica", peso: 4 },
    { token: "historia clinica", peso: 4 }
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
    { token: "comprimidos", peso: 3 },
    { token: "farmacia", peso: 3 }
  ]
};

const UMBRAL_CLASIFICACION = 6;

import fastLevenshtein from 'fast-levenshtein';

export const clasificarDocumento = (textoNormalizado) => {
  const puntuaciones = {};

  // Inicializar puntuaciones
  for (const categoria in REGLAS_CLASIFICACION) {
    puntuaciones[categoria] = 0;
  }

  const texto = (textoNormalizado || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.,;:()-\[\]]/g, ' ');
  const palabrasTexto = texto.split(/\s+/).filter(p => p.length > 0);

  // Evaluar reglas
  for (const [categoria, reglas] of Object.entries(REGLAS_CLASIFICACION)) {
    for (const regla of reglas) {
      const terminoStr = regla.token.toLowerCase();
      const palabrasTermino = terminoStr.split(/\s+/);
      const numPalabrasTermino = palabrasTermino.length;

      let coincidencias = 0;

      // Buscar si el token (de una o varias palabras) está en el texto con tolerancia
      for (let i = 0; i <= palabrasTexto.length - numPalabrasTermino; i++) {
        let coincideCompleto = true;

        for (let j = 0; j < numPalabrasTermino; j++) {
          const palabraTexto = palabrasTexto[i + j];
          const palabraDiccionario = palabrasTermino[j];

          // Permitir 0 de distancia para palabras cortas (<= 3 letras), sino max 2 de Levenshtein
          const maxDistancia = palabraDiccionario.length <= 3 ? 0 : 2;
          const distancia = fastLevenshtein.get(palabraTexto, palabraDiccionario);

          if (distancia > maxDistancia) {
            coincideCompleto = false;
            break;
          }
        }

        if (coincideCompleto) {
          coincidencias++;
        }
      }

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
