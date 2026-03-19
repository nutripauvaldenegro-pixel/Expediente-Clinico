import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js usando CDN para no saturar los assets locales si el usuario tiene internet,
// O bien configurarlo localmente. Dado que es Air-gapped, deberíamos usar el worker local si es posible.
// En Vite podemos importarlo usando '?url'.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const convertirPdfAImagenes = async (file, onProgress) => {
  if (onProgress) onProgress({ step: 'Procesando PDF (Páginas)', progress: 0 });

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const blobs = [];

  // Procesar todas las páginas sin límite estricto, tal como lo requiere el expediente completo
  const maxPages = numPages;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);

    // Escala para mejorar la resolución para el OCR (2.0 = 200% zoom)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    blobs.push(blob);

    if (onProgress) {
      onProgress({ step: `Convirtiendo PDF Pág. ${i} de ${maxPages}`, progress: (i / maxPages) * 100 });
    }
  }

  return blobs;
};
