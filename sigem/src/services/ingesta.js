import { calcularSHA256 } from './hashing';
import { procesarOCR } from './ocr';
import { convertirPdfAImagen } from './pdfConverter';

export const procesarDocumento = async (file, onProgress) => {
  try {
    // 1. Calcular Hash SHA-256 para integridad
    if (onProgress) onProgress({ step: 'hashing', progress: 0 });
    const hashHex = await calcularSHA256(file);
    if (onProgress) onProgress({ step: 'hashing', progress: 1 });

    let fileToOcr = file;

    // 2. Preprocesar si es PDF
    if (file.type === 'application/pdf') {
       if (onProgress) onProgress({ step: 'Preparando PDF para Visión', progress: 50 });
       const pdfBlob = await convertirPdfAImagen(file, (p) => {
          // opcional: mapear progreso pdf
       });
       // Tesseract.js espera un input que pueda entender. El Blob convertido a File funciona.
       fileToOcr = new File([pdfBlob], file.name.replace('.pdf', '.png'), { type: 'image/png' });
    }

    // 3. Extraer OCR, texto normalizado, coordenadas y confianza
    if (onProgress) onProgress({ step: 'ocr', progress: 0 });
    const ocrData = await procesarOCR(fileToOcr, (p) => {
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
