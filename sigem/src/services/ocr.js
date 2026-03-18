import { createWorker } from 'tesseract.js';

const TESSERACT_LANG = 'spa';

// Función para transformar la imagen usando Canvas API (Erosión/Dilatación básica o Mejora de Contraste)
export const mejorarImagen = (fileOrBlob) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;

      // Aquí se podrían aplicar filtros nativos de Canvas (contraste, escala de grises, etc.)
      // Para un simple mejora de legibilidad aplicamos el filtro antes de dibujar:
      ctx.filter = 'contrast(1.5) grayscale(1)';

      // Dibujar la imagen original con el filtro aplicado
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob);
        URL.revokeObjectURL(img.src);
      }, fileOrBlob.type || 'image/png');
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };
  });
};

export const procesarOCR = async (file, onProgress) => {
  try {
    const worker = await createWorker(TESSERACT_LANG, 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core.wasm.js',
      langPath: '/tesseract',
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    });

    // Primera pasada
    let { data } = await worker.recognize(file);

    // Detección de calidad (Heurística simple basada en confianza)
    if (data.confidence < 60) {
      console.warn(`Confianza baja (${data.confidence}%). Aplicando transformaciones de imagen...`);
      const imagenMejorada = await mejorarImagen(file);

      // Segunda pasada con imagen mejorada
      const resultadoMejorado = await worker.recognize(imagenMejorada);
      data = resultadoMejorado.data;
    }

    await worker.terminate();

    // Extracción Multicapa
    const textoPlano = data.text;
    const textoNormalizado = normalizarTexto(textoPlano);

    // Formato de coordenadas estructuradas a partir del hOCR o de los "words" de Tesseract
    const coordenadas = data.words.map(w => ({
      text: w.text,
      x0: w.bbox.x0,
      y0: w.bbox.y0,
      x1: w.bbox.x1,
      y1: w.bbox.y1,
      confidence: w.confidence
    }));

    return {
      textoPlano,
      textoNormalizado,
      coordenadas,
      confidence: data.confidence,
      ocrDataRaw: JSON.stringify(coordenadas) // Para guardar en JSON metadata
    };

  } catch (error) {
    console.error("Error en OCR:", error);
    throw error;
  }
};

const normalizarTexto = (texto) => {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Quitar acentos
};
