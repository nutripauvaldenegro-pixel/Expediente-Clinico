import { getDb, saveDb } from '../db';
import { procesarDocumento } from './ingesta';
import { clasificarDocumento } from './clasificacion';
import { extraerFechaPrincipal } from './extraccion';

export const procesarYGuardarDocumento = async (file, onProgress) => {
  const db = getDb();

  // 1. Ingesta (OCR y Hash)
  const ocrResult = await procesarDocumento(file, onProgress);

  // 2. Clasificación Heurística
  let clasificacion = clasificarDocumento(ocrResult.textoNormalizado);

  // 2.1 Verificar Memoria "Human-in-the-loop"
  try {
    const memoria = db.exec(`SELECT palabra_clave, categoria_asignada FROM memoria_human_in_the_loop`);
    if (memoria.length > 0) {
      for (const row of memoria[0].values) {
        const [palabraClave, catAsignada] = row;
        if (ocrResult.textoNormalizado.includes(palabraClave.toLowerCase())) {
          clasificacion.categoria = catAsignada;
          clasificacion.esAmbigua = false;
          // Guardamos en log que fue por memoria
          clasificacion.puntuaciones['HITL_OVERRIDE'] = 100;
          break; // Tomar la primera coincidencia
        }
      }
    }
  } catch (e) {
    console.error("Error leyendo memoria HITL", e);
  }

  // 3. Extracción de Datos Evolucionada (Fechas)
  const fechaStr = extraerFechaPrincipal(ocrResult.textoPlano, ocrResult.coordenadas);

  // Parsear fecha a formato YYYY-MM-DD para SQLite si se encontró (simple approach)
  let fechaSql = null;
  if (fechaStr) {
    // Si viene en DD/MM/YYYY
    const partes = fechaStr.split(/[-/]/);
    if (partes.length === 3) {
      if (partes[0].length === 4) { // YYYY-MM-DD
         fechaSql = `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
      } else { // DD/MM/YYYY
         fechaSql = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }
  }

  // 4. Construir metadata JSON
  const metadata = {
    puntuaciones_heuristica: clasificacion.puntuaciones,
    es_ambiguo: clasificacion.esAmbigua,
    ocr_confidence: ocrResult.confidence,
    coordenadas_json: ocrResult.ocrDataRaw
  };

  // 5. Persistencia
  try {
    const stmt = db.prepare(`
      INSERT INTO documentos
      (nombre_archivo, hash_sha256, fecha_principal, categoria_sugerida, texto_raw, metadata_json, archivo_blob, archivo_mime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      file.name,
      ocrResult.hash_sha256,
      fechaSql, // Puede ser null
      clasificacion.categoria,
      ocrResult.textoPlano,
      JSON.stringify(metadata),
      ocrResult.archivo_blob,
      ocrResult.archivo_mime
    ]);

    stmt.free();

    // 6. Inserción de Eventos (Ejemplo simulado de "Orden Médica" y "Resultado")
    // Para probar el reporte de tiempos, agregamos eventos cronológicos automáticamente basados en la categoría
    const lastInsertId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];

    if (fechaSql) {
      if (clasificacion.categoria === "Receta Medica") {
        db.run(`INSERT INTO eventos_cronologia (documento_id, fecha_evento, descripcion_hito, gravedad) VALUES (?, ?, 'Orden Médica Emitida', 3)`, [lastInsertId, fechaSql]);
      } else if (clasificacion.categoria === "Laboratorio" || clasificacion.categoria === "Radiologia") {
        db.run(`INSERT INTO eventos_cronologia (documento_id, fecha_evento, descripcion_hito, gravedad) VALUES (?, ?, 'Resultado Reportado', 2)`, [lastInsertId, fechaSql]);
      }
    }

    await saveDb();

    return true;
  } catch (error) {
    // Error de clave duplicada (Hash)
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`El documento ya existe (Hash duplicado: ${ocrResult.hash_sha256})`);
    }
    throw error;
  }
};

// --- Módulo Analítico ---

export const buscarInconsistencias = (termino) => {
  const db = getDb();
  // Busca el término exacto (se podría mejorar con Levenshtein en SQL pero SQLite en web no tiene la función nativa)
  // Lo hacemos en JS

  const docs = db.exec(`SELECT id, nombre_archivo, texto_raw, fecha_principal FROM documentos ORDER BY fecha_principal ASC`);
  if (!docs.length) return [];

  const resultados = [];
  const rows = docs[0].values;

  const terminoRegex = new RegExp(`\\b${termino.toLowerCase()}\\b`, 'i');
  // Buscar un patrón de negación del término (ej "sin alergias" vs "alergia")
  const negacionRegex = new RegExp(`\\b(sin|no hay|niega)\\s+${termino.toLowerCase()}\\b`, 'i');

  rows.forEach(row => {
    const [id, nombre, texto, fecha] = row;
    const tieneTermino = terminoRegex.test(texto);
    const tieneNegacion = negacionRegex.test(texto);

    if (tieneTermino || tieneNegacion) {
      resultados.push({
        id, nombre, fecha,
        tipo: tieneNegacion ? 'NEGACION' : 'AFIRMACION',
        contexto: extraerContextoProximo(texto, tieneNegacion ? negacionRegex : terminoRegex)
      });
    }
  });

  return resultados;
};

// Buscador de Contexto Próximo
export const extraerContextoProximo = (texto, regexOrString, radio = 100) => {
  const match = typeof regexOrString === 'string'
    ? texto.match(new RegExp(regexOrString, 'i'))
    : texto.match(regexOrString);

  if (!match) return null;

  const index = match.index;
  const inicio = Math.max(0, index - radio);
  const fin = Math.min(texto.length, index + match[0].length + radio);

  return {
    previo: texto.substring(inicio, index),
    match: match[0],
    posterior: texto.substring(index + match[0].length, fin)
  };
};

// Reporte de Tiempos
export const generarReporteTiempos = () => {
  const db = getDb();
  const eventos = db.exec(`
    SELECT e.descripcion_hito, e.fecha_evento, d.nombre_archivo
    FROM eventos_cronologia e
    JOIN documentos d ON e.documento_id = d.id
    ORDER BY e.fecha_evento ASC
  `);

  if (!eventos.length) return [];
  return eventos[0].values.map(row => ({
    hito: row[0],
    fecha: row[1],
    archivo: row[2]
  }));
};
