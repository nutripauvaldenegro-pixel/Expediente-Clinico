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

    // 3. Extraer OCR, texto normalizado, coordenadas y confianza por cada página
    let textoPlanoConsolidado = "";
    let textoNormalizadoConsolidado = "";
    let coordenadasConsolidadas = [];
    let confianzas = [];
    let ocrDataRawConsolidado = [];

    for (let i = 0; i < filesToOcr.length; i++) {
      if (onProgress) onProgress({ step: `Visión OCR (Pág. ${i+1}/${filesToOcr.length})`, progress: 0 });

      const ocrData = await procesarOCR(filesToOcr[i], (p) => {
        if (onProgress) onProgress({ step: `Visión OCR (Pág. ${i+1}/${filesToOcr.length})`, progress: p * 100 });
      });

      textoPlanoConsolidado += ocrData.textoPlano + "\n\n--- FIN PÁGINA " + (i+1) + " ---\n\n";
      textoNormalizadoConsolidado += ocrData.textoNormalizado + "\n";
      // Ajustar la Y virtualmente si quisieramos concatenar páginas, aquí simplemente las guardamos con un offset "falso" o etiqueta
      coordenadasConsolidadas = coordenadasConsolidadas.concat(
         ocrData.coordenadas.map(c => ({...c, page: i+1}))
      );
      confianzas.push(ocrData.confidence);
      ocrDataRawConsolidado.push(JSON.parse(ocrData.ocrDataRaw));
    }

    // Calcular confianza promedio
    const avgConfidence = confianzas.length > 0 ? (confianzas.reduce((a,b)=>a+b, 0) / confianzas.length) : 0;

    // Convertir el archivo original a Uint8Array para guardarlo como BLOB en SQLite
    const originalFileBuffer = await file.arrayBuffer();
    const originalFileUint8 = new Uint8Array(originalFileBuffer);

    return {
      nombre_archivo: file.name,
      hash_sha256: hashHex,
      textoPlano: textoPlanoConsolidado,
      textoNormalizado: textoNormalizadoConsolidado,
      coordenadas: coordenadasConsolidadas,
      confidence: avgConfidence,
      ocrDataRaw: JSON.stringify(ocrDataRawConsolidado),
      archivo_blob: originalFileUint8,
      archivo_mime: file.type
    };
  } catch (error) {
    console.error("Error procesando documento:", error);
    throw error;
  }
};
