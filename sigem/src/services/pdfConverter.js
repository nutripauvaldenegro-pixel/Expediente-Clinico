import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js usando CDN para no saturar los assets locales si el usuario tiene internet,
// O bien configurarlo localmente. Dado que es Air-gapped, deberíamos usar el worker local si es posible.
// En Vite podemos importarlo usando '?url'.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const convertirPdfAImagen = async (file, onProgress) => {
  if (onProgress) onProgress({ step: 'pdf_conversion', progress: 0 });

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Por ahora, procesamos la primera página para el expediente médico simple
  // En un sistema avanzado se iterarían todas las páginas.
  const numPages = pdf.numPages;
  const page = await pdf.getPage(1);

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
  if (onProgress) onProgress({ step: 'pdf_conversion', progress: 100 });

  // Convertir canvas a Blob para pasarlo a Tesseract
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};
