export const DICCIONARIO_CLINICO = {
  sintomas_y_diagnosticos: [
    "cefalea", "fiebre", "tos", "mialgia", "astenia", "hipertension", "diabetes",
    "asma", "dolor abdominal", "disnea", "nauseas", "vomitos", "diarrea",
    "mareos", "vertigo", "fatiga", "ansiedad", "depresion", "obesidad",
    "dislipidemia", "arritmia", "taquicardia", "bradicardia", "hipotiroidismo",
    "hipertiroidismo", "artritis", "artrosis", "lumbalgia", "cervicalgia", "alergia",
    "insomnio", "anemia", "gastritis", "infeccion", "sindrome", "traumatismo",
    "fractura", "esguince", "inflamacion", "edema", "hemorragia", "convulsiones",
    "sintomatologia", "motivo de consulta"
  ],
  medicamentos_y_tratamientos: [
    "paracetamol", "ibuprofeno", "amoxicilina", "azitromicina", "losartan",
    "enalapril", "metformina", "insulina", "omeprazol", "levotiroxina",
    "atorvastatina", "simvastatina", "aspirina", "diclofenaco", "naproxeno",
    "ketorolaco", "tramadol", "clonazepam", "diazepam", "alprazolam",
    "lorazepam", "fluoxetina", "sertralina", "escitalopram", "salbutamol",
    "budesonida", "prednisona", "hidrocortisona", "dexametasona", "ibuprofeno",
    "antibiotico", "analgesico", "antiinflamatorio", "antidepresivo", "antihipertensivo",
    "corticoides", "jarabe", "comprimidos", "capsulas", "inyeccion", "suero",
    "tratamiento farmacologico"
  ],
  procedimientos_y_examenes: [
    "ecografia", "tomografia", "tac", "resonancia magnetica", "rmn", "radiografia",
    "rayos x", "electrocardiograma", "ecocardiograma", "endoscopia", "colonoscopia",
    "hemograma", "perfil lipidico", "glicemia", "creatinina", "urea", "acido urico",
    "orina completa", "pcr", "test de antigeno", "biopsia", "cirugia", "sutura",
    "kinesiologia", "fisioterapia", "psicoterapia", "examen", "laboratorio",
    "muestra", "cultivo", "urocultivo", "procedimiento", "signos vitales",
    "frecuencia cardiaca", "presion arterial", "temperatura", "saturacion",
    "glicemia capilar"
  ]
};

import fastLevenshtein from 'fast-levenshtein';

export const extraerEntidadesClinicas = (textoNormalizado) => {
  const entidadesEncontradas = {
    sintomas_y_diagnosticos: [],
    medicamentos_y_tratamientos: [],
    procedimientos_y_examenes: []
  };

  // Normalizar para quitar acentos y limpiar caracteres especiales
  const texto = (textoNormalizado || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.,;:()-\[\]]/g, ' ');
  const palabrasTexto = texto.split(/\s+/).filter(p => p.length > 0);

  Object.keys(DICCIONARIO_CLINICO).forEach((categoria) => {
    DICCIONARIO_CLINICO[categoria].forEach((termino) => {
      const terminoStr = termino.toLowerCase();
      const palabrasTermino = terminoStr.split(/\s+/);
      const numPalabrasTermino = palabrasTermino.length;

      let encontrado = false;

      // Buscar si el término (de una o varias palabras) está en el texto con tolerancia
      for (let i = 0; i <= palabrasTexto.length - numPalabrasTermino; i++) {
        let coincideCompleto = true;

        for (let j = 0; j < numPalabrasTermino; j++) {
          const palabraTexto = palabrasTexto[i + j];
          const palabraDiccionario = palabrasTermino[j];

          // Permitir 0 de distancia para palabras cortas (<= 3 letras), sino max 2 de Levenshtein
          const maxDistancia = palabraDiccionario.length <= 3 ? 0 : 2;
          const distancia = fastLevenshtein.get(palabraTexto, palabraDiccionario);

          if (distancia > maxDistancia) {
            coincideCompleto = false;
            break;
          }
        }

        if (coincideCompleto) {
          encontrado = true;
          break;
        }
      }

      if (encontrado) {
        entidadesEncontradas[categoria].push(termino);
      }
    });
  });

  return entidadesEncontradas;
};
