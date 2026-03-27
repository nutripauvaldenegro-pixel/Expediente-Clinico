import { clasificarDocumento } from './src/services/clasificacion.js';
const texto = `SIGNOS VITALES HORA PESO PAS PAD TEMP RECTAL T. AXILAR FRECUENCIA CARDIACA SAT O2 FREC. RESP GLICEMIA CAPILAR
17:11:02 133 89 36.3 124 97
Anamnesis y Ex. Físico:
ALERGIAS (-)
MORB: ENF BECET.
QX: (-) (16401772-9 - JUAN PATRICIO ROJAS SAAVEDRA) -Fecha:(22-11-2025) -Hora:(17:06:07)
se trata de paciente femenino de 30años, con enferdad de base conocida quien acude por presentar dolor, paciente con crisis dolorosa con casi un
mes de duracion acude por dolor intso (24775589-6 - GEYSER JAVIER BRITO SUCRE) -Fecha:(22-11-2025) -Hora:(17:12:27)
Exploración:
PAS: 133
PAD: 89
T. Axilar: 36.3
Frecuencia Cardiaca: 124
Sat. O2: 97
al ex fisico en boca se evidencia aumento de volumen de mucosa en region gingival arcada inferior izquierda
adenomegalia submaxilares bilaterales.
torax simetrico normoexpansible sin agregados
Hipótesis Diagnóstica:
(G635) POLINEUROPATIA EN TRASTORNOS DEL TEJIDO CONECTIVO SISTEMICO (M30-M35+)
(D76) CIERTAS ENFERMEDADES QUE AFECTAN AL TEJIDO LINFORRETICULAR Y AL SISTEMA RETICULOENDOTELIAL`;
console.log(clasificarDocumento(texto));
