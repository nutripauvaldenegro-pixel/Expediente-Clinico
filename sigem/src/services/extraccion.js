import fastLevenshtein from 'fast-levenshtein';

// Busca un patrón de fecha alrededor de una palabra clave (ej. "fecha")
export const extraerFechaPrincipal = (textoPlano, coordenadas) => {
  const texto = textoPlano || "";
  const normalizado = texto.toLowerCase();
  const indexFecha = normalizado.indexOf("fecha");

  if (indexFecha === -1) {
    return buscarCualquierFecha(textoPlano, coordenadas);
  }

  // Buscar en un radio de 30 caracteres
  const inicio = Math.max(0, indexFecha - 10);
  const fin = Math.min(textoPlano.length, indexFecha + 30);
  const contexto = textoPlano.substring(inicio, fin);

  // Regex para fechas DD/MM/YYYY, YYYY-MM-DD
  const regexFecha = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}-\d{2}-\d{2})/;
  const match = contexto.match(regexFecha);

  if (match) {
    return match[0];
  }

  // Fallback si no está cerca de la palabra fecha
  return buscarCualquierFecha(textoPlano, coordenadas);
};

const buscarCualquierFecha = (texto, coordenadas) => {
  const regexFechas = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}-\d{2}-\d{2})/g;
  const matches = [...texto.matchAll(regexFechas)];

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0][0];

  // Si hay varias, buscar en coordenadas (priorizar cabecera / Y menor)
  let fechaPrioritaria = matches[0][0];
  let menorY = Infinity;

  for (const match of matches) {
    const fechaText = match[0];
    const coordFecha = coordenadas.find(c => c.text.includes(fechaText));
    if (coordFecha && coordFecha.y0 < menorY) {
      menorY = coordFecha.y0;
      fechaPrioritaria = fechaText;
    }
  }

  return fechaPrioritaria;
};

// Fuzzy Matching para normalización de nombres
export const normalizarEntidades = (nombre, listaConocida) => {
  let mejorMatch = nombre;
  let menorDistancia = Infinity;

  for (const conocido of listaConocida) {
    const distancia = fastLevenshtein.get(nombre.toLowerCase(), conocido.toLowerCase());
    if (distancia < menorDistancia && distancia <= 3) { // Umbral de tolerancia
      mejorMatch = conocido;
      menorDistancia = distancia;
    }
  }

  return mejorMatch;
};
