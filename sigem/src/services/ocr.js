// OCR Service using Gemini 2.5 Flash Lite

// La API Key de Gemini debería ser configurada en el entorno (ej: .env) para no subirla al repo
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AlzaSyBebt2xC8ziXViXjHkG7-4eLXvMNZ_Xx9w";
const GEMINI_MODEL = "gemini-2.5-flash-lite";

// Helper para convertir File/Blob a Base64 para Gemini
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // FileReader result es "data:image/png;base64,iVBORw0KGgo..."
      // Gemini necesita solo la parte base64
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const procesarOCR = async (file, onProgress) => {
  try {
    if (onProgress) {
       onProgress(0.1); // Simulando inicio
    }

    const base64Image = await fileToBase64(file);
    const mimeType = file.type || 'image/png'; // Default a png si no viene type (ej: extraido de PDF)

    if (onProgress) {
       onProgress(0.5); // Imagen codificada, enviando
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "Extrae de forma precisa y completa todo el texto que aparezca en esta imagen. Devuelve únicamente el texto extraído, sin agregar ningún comentario, saludo, introducción, formato de código markdown u otra cosa. Solo el texto en bruto tal como se lee en la imagen."
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Baja temperatura para que sea determinista y fiel a la imagen
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extraer texto de la respuesta de Gemini
    let textoPlano = "";
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
       textoPlano = data.candidates[0].content.parts[0].text;
    }

    if (onProgress) {
       onProgress(1.0); // Completado
    }

    const textoNormalizado = normalizarTexto(textoPlano);

    // Mockeamos las coordenadas estructuradas y la confianza para no romper la compatibilidad con el resto de la app
    // Gemini no devuelve bounding boxes palabra por palabra como Tesseract.
    const coordenadas = [];
    const confidence = 95; // Confianza simulada alta ya que Gemini suele ser muy preciso

    return {
      textoPlano,
      textoNormalizado,
      coordenadas,
      confidence: confidence,
      ocrDataRaw: JSON.stringify(coordenadas) // Para guardar en JSON metadata
    };

  } catch (error) {
    console.error("Error en OCR (Gemini):", error);
    throw error;
  }
};

const normalizarTexto = (texto) => {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Quitar acentos
};
