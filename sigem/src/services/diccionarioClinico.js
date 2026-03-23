export const DICCIONARIO_CLINICO = {
  sintomas: [
    "cefalea", "fiebre", "tos", "mialgia", "astenia", "dolor abdominal", "disnea",
    "nauseas", "vomitos", "diarrea", "mareos", "vertigo", "fatiga", "ansiedad",
    "depresion", "insomnio", "inflamacion", "edema", "hemorragia", "convulsiones",
    "sintomatologia", "motivo de consulta"
  ],
  diagnosticos: [
    "hipertension", "diabetes", "asma", "obesidad", "dislipidemia", "arritmia",
    "taquicardia", "bradicardia", "hipotiroidismo", "hipertiroidismo", "artritis",
    "artrosis", "lumbalgia", "cervicalgia", "alergia", "anemia", "gastritis",
    "infeccion", "sindrome", "traumatismo", "fractura", "esguince", "diagnostico"
  ],
  medicamentos: [
    "paracetamol", "ibuprofeno", "amoxicilina", "azitromicina", "losartan",
    "enalapril", "metformina", "insulina", "omeprazol", "levotiroxina",
    "atorvastatina", "simvastatina", "aspirina", "diclofenaco", "naproxeno",
    "ketorolaco", "tramadol", "clonazepam", "diazepam", "alprazolam",
    "lorazepam", "fluoxetina", "sertralina", "escitalopram", "salbutamol",
    "budesonida", "prednisona", "hidrocortisona", "dexametasona", "antibiotico",
    "analgesico", "antiinflamatorio", "antidepresivo", "antihipertensivo",
    "corticoides", "jarabe", "comprimidos", "capsulas", "inyeccion", "suero"
  ],
  tratamientos: [
    "tratamiento", "terapia", "kinesiologia", "fisioterapia", "psicoterapia",
    "reposo", "dieta", "ejercicio", "cirugia", "sutura", "intervencion",
    "tratamiento farmacologico"
  ],
  examenes: [
    "ecografia", "tomografia", "tac", "resonancia magnetica", "rmn", "radiografia",
    "rayos x", "electrocardiograma", "ecocardiograma", "endoscopia", "colonoscopia",
    "hemograma", "perfil lipidico", "glicemia", "creatinina", "urea", "acido urico",
    "orina completa", "pcr", "test de antigeno", "biopsia", "examen", "laboratorio",
    "muestra", "cultivo", "urocultivo"
  ],
  procedimientos: [
    "procedimiento", "signos vitales", "frecuencia cardiaca", "presion arterial",
    "temperatura", "saturacion", "glicemia capilar", "toma de muestra", "curacion",
    "evaluacion", "control"
  ]
};

// La API Key de Gemini debería ser configurada en el entorno (ej: .env) para no subirla al repo
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-lite";

export const extraerEntidadesClinicas = async (textoNormalizado) => {
  const entidadesVacias = {
    sintomas: [],
    diagnosticos: [],
    medicamentos: [],
    tratamientos: [],
    examenes: [],
    procedimientos: []
  };

  if (!textoNormalizado || textoNormalizado.trim().length === 0) {
    return entidadesVacias;
  }

  if (!GEMINI_API_KEY) {
    console.warn("API Key de Gemini no configurada. Saltando extracción de entidades por IA.");
    return entidadesVacias;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
Actúa como un médico experto. Analiza el siguiente texto extraído de un documento médico y extrae las entidades clínicas mencionadas, clasificándolas en las siguientes 6 categorías estrictas: "sintomas", "diagnosticos", "medicamentos", "tratamientos", "examenes" y "procedimientos".

Devuelve ÚNICAMENTE un objeto JSON válido con este formato exacto, sin markdown (\`\`\`json) ni texto adicional:
{
  "sintomas": ["sintoma1", "sintoma2"],
  "diagnosticos": ["diagnostico1"],
  "medicamentos": ["medicamento1"],
  "tratamientos": [],
  "examenes": [],
  "procedimientos": []
}

Si no encuentras entidades para una categoría, deja el arreglo vacío []. Si el texto no contiene información médica relevante, devuelve todas las listas vacías. Trata de mantener los nombres normalizados (ej. "paracetamol" en vez de "el paracetamol").

TEXTO A ANALIZAR:
${textoNormalizado}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Baja temperatura para JSON determinista
      }
    };


    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error("Gemini API Error (Entidades):", await response.json());
      return entidadesVacias;
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
       let respuestaTexto = data.candidates[0].content.parts[0].text;
       // Limpiar markdown si el modelo decide ignorar la regla de "sin markdown"
       respuestaTexto = respuestaTexto.replace(/```json/gi, '').replace(/```/g, '').trim();

       try {
         const entidadesParseadas = JSON.parse(respuestaTexto);

         // Validar que la estructura esté correcta y llenar faltantes
         return {
            sintomas: Array.isArray(entidadesParseadas.sintomas) ? entidadesParseadas.sintomas : [],
            diagnosticos: Array.isArray(entidadesParseadas.diagnosticos) ? entidadesParseadas.diagnosticos : [],
            medicamentos: Array.isArray(entidadesParseadas.medicamentos) ? entidadesParseadas.medicamentos : [],
            tratamientos: Array.isArray(entidadesParseadas.tratamientos) ? entidadesParseadas.tratamientos : [],
            examenes: Array.isArray(entidadesParseadas.examenes) ? entidadesParseadas.examenes : [],
            procedimientos: Array.isArray(entidadesParseadas.procedimientos) ? entidadesParseadas.procedimientos : []
         };
       } catch (parseError) {
         console.error("Error parseando respuesta JSON de Gemini:", respuestaTexto, parseError);
         return entidadesVacias;
       }
    }

    return entidadesVacias;

  } catch (error) {
    console.error("Error conectando con Gemini para extracción de entidades:", error);
    return entidadesVacias;
  }
};
