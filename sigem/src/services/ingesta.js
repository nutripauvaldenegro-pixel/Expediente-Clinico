import { calcularSHA256 } from './hashing';
import { procesarOCR } from './ocr';
import { convertirPdfAImagenes } from './pdfConverter';

export const procesarDocumento = async (file, onProgress) => {
  try {
    // 1. Calcular Hash SHA-256 para integridad
    if (onProgress) onProgress({ step: 'Verificando Hash SHA-256', progress: 0 });
    const hashHex = await calcularSHA256(file);
    if (onProgress) onProgress({ step: 'Verificando Hash SHA-256', progress: 100 });

    let filesToOcr = [file];

    // 2. Preprocesar si es PDF
    if (file.type === 'application/pdf') {
       if (onProgress) onProgress({ step: 'Iniciando Conversión PDF', progress: 0 });
       const pdfBlobs = await convertirPdfAImagenes(file, (p) => {
          if (onProgress) onProgress({ step: p.step, progress: p.progress });
       });
       // Convertir blobs a Files
       filesToOcr = pdfBlobs.map((blob, idx) =>
         new File([blob], `${file.name.replace('.pdf', '')}_pag_${idx+1}.png`, { type: 'image/png' })
       );
    }

    // 3. Extraer OCR, texto normalizado, coordenadas y confianza por cada página de forma granular
    const paginas = [];

    for (let i = 0; i < filesToOcr.length; i++) {
      if (onProgress) onProgress({ step: `Visión OCR (Pág. ${i+1}/${filesToOcr.length})`, progress: 0 });

      const ocrData = await procesarOCR(filesToOcr[i], (p) => {
        if (onProgress) onProgress({ step: `Visión OCR (Pág. ${i+1}/${filesToOcr.length})`, progress: p * 100 });
      });

      // Guardamos la información específica de cada página
      paginas.push({
        pageNumber: i + 1,
        textoPlano: ocrData.textoPlano,
        textoNormalizado: ocrData.textoNormalizado,
        coordenadas: ocrData.coordenadas, // Ya sin offset "falso", coordenadas puras relativas a su página
        confidence: ocrData.confidence,
        ocrDataRaw: JSON.parse(ocrData.ocrDataRaw)
      });
    }

    // Calcular confianza promedio del documento global
    const avgConfidence = paginas.length > 0
      ? (paginas.reduce((acc, p) => acc + p.confidence, 0) / paginas.length)
      : 0;

    // Convertir el archivo original a Uint8Array para guardarlo como BLOB en SQLite
    const originalFileBuffer = await file.arrayBuffer();
    const originalFileUint8 = new Uint8Array(originalFileBuffer);

    return {
      nombre_archivo: file.name,
      hash_sha256: hashHex,
      // Retenemos el texto consolidado por completitud si es necesario para búsqueda rápida full-text
      textoPlano: paginas.map(p => p.textoPlano).join('\n\n---\n\n'),
      paginas_granulares: paginas, // Nueva estructura
      confidence: avgConfidence,
      archivo_blob: originalFileUint8,
      archivo_mime: file.type
    };
  } catch (error) {
    console.error("Error procesando documento:", error);
    throw error;
  }
};
