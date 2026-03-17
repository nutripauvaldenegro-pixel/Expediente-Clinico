import { calcularSHA256 } from './hashing';
import { procesarOCR } from './ocr';

export const procesarDocumento = async (file, onProgress) => {
  try {
    // 1. Calcular Hash SHA-256 para integridad
    if (onProgress) onProgress({ step: 'hashing', progress: 0 });
    const hashHex = await calcularSHA256(file);
    if (onProgress) onProgress({ step: 'hashing', progress: 1 });

    // 2. Extraer OCR, texto normalizado, coordenadas y confianza
    if (onProgress) onProgress({ step: 'ocr', progress: 0 });
    const ocrData = await procesarOCR(file, (p) => {
      if (onProgress) onProgress({ step: 'ocr', progress: p });
    });

    return {
      nombre_archivo: file.name,
      hash_sha256: hashHex,
      ...ocrData
    };
  } catch (error) {
    console.error("Error procesando documento:", error);
    throw error;
  }
};
