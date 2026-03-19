import fastLevenshtein from 'fast-levenshtein';

// Valida si la fecha extraída es coherente (ej. no es en el futuro ni muy antigua)
const esFechaValida = (fechaStr) => {
  if (!fechaStr) return false;

  // Normalizar separadores
  const normalizada = fechaStr.replace(/-/g, '/');

  let partes;
  let year, month, day;

  // Intenta parsear YYYY/MM/DD o DD/MM/YYYY
  if (normalizada.includes('/')) {
    partes = normalizada.split('/');
    if (partes[0].length === 4) {
      year = parseInt(partes[0], 10);
      month = parseInt(partes[1], 10);
      day = parseInt(partes[2], 10);
    } else {
      day = parseInt(partes[0], 10);
      month = parseInt(partes[1], 10);
      let y = partes[2];
      // Manejar años de 2 dígitos
      if (y.length === 2) {
        y = "20" + y; // Asume 20xx
      }
      year = parseInt(y, 10);
    }
  } else {
    return false;
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const currentYear = new Date().getFullYear();
  // Se asume válido si el año es >= 1900 y <= Año Actual
  if (year < 1900 || year > currentYear) return false;

  return true;
};

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
  const regexFecha = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}-\d{2}-\d{2})/g;
  const matches = [...contexto.matchAll(regexFecha)];

  for (const match of matches) {
    if (esFechaValida(match[0])) {
      return match[0];
    }
  }

  // Fallback si no está cerca de la palabra fecha o no es válida
  return buscarCualquierFecha(textoPlano, coordenadas);
};

const buscarCualquierFecha = (texto, coordenadas) => {
  const regexFechas = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}-\d{2}-\d{2})/g;
  const matches = [...texto.matchAll(regexFechas)];

  const fechasValidas = matches.map(m => m[0]).filter(esFechaValida);

  if (fechasValidas.length === 0) return null;
  if (fechasValidas.length === 1) return fechasValidas[0];

  // Si hay varias, buscar en coordenadas (priorizar cabecera / Y menor)
  let fechaPrioritaria = fechasValidas[0];
  let menorY = Infinity;

  for (const fechaText of fechasValidas) {
    const coordFecha = coordenadas.find(c => c.text && c.text.includes(fechaText));
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
