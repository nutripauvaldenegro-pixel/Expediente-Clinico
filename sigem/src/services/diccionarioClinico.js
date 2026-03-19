export const DICCIONARIO_CLINICO = {
  sintomas_y_diagnosticos: [
    "cefalea", "fiebre", "tos", "mialgia", "astenia", "hipertension", "diabetes",
    "asma", "dolor abdominal", "disnea", "nauseas", "vomitos", "diarrea",
    "mareos", "vertigo", "fatiga", "ansiedad", "depresion", "obesidad",
    "dislipidemia", "arritmia", "taquicardia", "bradicardia", "hipotiroidismo",
    "hipertiroidismo", "artritis", "artrosis", "lumbalgia", "cervicalgia", "alergia"
  ],
  medicamentos_y_tratamientos: [
    "paracetamol", "ibuprofeno", "amoxicilina", "azitromicina", "losartan",
    "enalapril", "metformina", "insulina", "omeprazol", "levotiroxina",
    "atorvastatina", "simvastatina", "aspirina", "diclofenaco", "naproxeno",
    "ketorolaco", "tramadol", "clonazepam", "diazepam", "alprazolam",
    "lorazepam", "fluoxetina", "sertralina", "escitalopram", "salbutamol",
    "budesonida", "prednisona", "hidrocortisona", "dexametasona", "ibuprofeno"
  ],
  procedimientos_y_examenes: [
    "ecografia", "tomografia", "tac", "resonancia magnetica", "rmn", "radiografia",
    "rayos x", "electrocardiograma", "ecocardiograma", "endoscopia", "colonoscopia",
    "hemograma", "perfil lipidico", "glicemia", "creatinina", "urea", "acido urico",
    "orina completa", "pcr", "test de antigeno", "biopsia", "cirugia", "sutura",
    "kinesiologia", "fisioterapia", "psicoterapia"
  ]
};

export const extraerEntidadesClinicas = (textoNormalizado) => {
  const entidadesEncontradas = {
    sintomas_y_diagnosticos: [],
    medicamentos_y_tratamientos: [],
    procedimientos_y_examenes: []
  };

  const texto = textoNormalizado || "";

  // Buscar coincidencias de cada diccionario en el texto de la página
  Object.keys(DICCIONARIO_CLINICO).forEach((categoria) => {
    DICCIONARIO_CLINICO[categoria].forEach((termino) => {
      // Búsqueda exacta del término (word boundaries para evitar falsos positivos como "tos" en "tosco")
      const regex = new RegExp(`\\b${termino}\\b`, 'gi');
      if (regex.test(texto)) {
        entidadesEncontradas[categoria].push(termino);
      }
    });
  });

  return entidadesEncontradas;
};
