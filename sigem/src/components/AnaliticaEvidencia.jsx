import { useState } from 'react';
import { getDb } from '../db';

export default function AnaliticaEvidencia() {
  const [inconsistencias, setInconsistencias] = useState([]);
  const [termino, setTermino] = useState('alergia');

  const handleBuscar = () => {
    try {
      const db = getDb();
      // En un entorno real se haria una consulta compleja con regex en JS o usando Full Text Search si se compilara sql.js con esa flag
      const docs = db.exec(`SELECT id, nombre_archivo, texto_raw, fecha_principal FROM documentos ORDER BY fecha_principal ASC`);
      if (!docs.length) {
        setInconsistencias([]);
        return;
      }

      const resultados = [];
      const rows = docs[0].values;

      const terminoRegex = new RegExp(`\\b${termino.toLowerCase()}\\b`, 'i');
      const negacionRegex = new RegExp(`\\b(sin|no hay|niega|desconoce)\\s+${termino.toLowerCase()}\\b`, 'i');

      rows.forEach(row => {
        const [id, nombre, texto, fecha] = row;

        // Simular matriz de inconsistencia: Buscar el termino y buscar la negación
        const tieneTermino = terminoRegex.test(texto);
        const tieneNegacion = negacionRegex.test(texto);

        if (tieneTermino || tieneNegacion) {
          // Extraer contexto (párrafo anterior y posterior)
          const match = tieneNegacion ? texto.match(negacionRegex) : texto.match(terminoRegex);
          const index = match.index;
          const inicio = Math.max(0, index - 50);
          const fin = Math.min(texto.length, index + match[0].length + 50);

          resultados.push({
            id, nombre, fecha,
            tipo: tieneNegacion ? 'NEGACION' : 'AFIRMACION',
            contexto: {
              previo: texto.substring(inicio, index).replace(/\\n/g, ' '),
              match: match[0],
              posterior: texto.substring(index + match[0].length, fin).replace(/\\n/g, ' ')
            }
          });
        }
      });

      setInconsistencias(resultados);
    } catch (error) {
      console.error("Error buscando inconsistencias:", error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Generador de Evidencia Analítica</h2>

      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Matriz de Inconsistencias (Búsqueda Cruzada Cronológica)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            className="flex-1 border-gray-300 rounded shadow-sm py-2 px-3 border focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej. Alergia, Diabetes, Penicilina..."
          />
          <button
            onClick={handleBuscar}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors"
          >
            Auditar Historial
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Busca contradicciones en el expediente. Ejemplo: "Alergia a Penicilina" vs "Sin alergias conocidas" en documentos posteriores.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Resultados (Buscador de Contexto Próximo)</h3>
        {inconsistencias.length === 0 ? (
          <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded">No se encontraron menciones para el término buscado en la base de datos.</p>
        ) : (
          <div className="space-y-4">
            {inconsistencias.map((inc, i) => (
              <div key={i} className={`p-4 rounded-lg border-l-4 shadow-sm ${inc.tipo === 'NEGACION' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">{inc.nombre}</span>
                  <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-600 shadow-sm">
                    {inc.fecha || 'Fecha desconocida'}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-700 font-mono bg-white p-3 rounded border">
                  <span className="text-gray-400">...{inc.contexto.previo}</span>
                  <mark className={`font-bold px-1 rounded ${inc.tipo === 'NEGACION' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {inc.contexto.match}
                  </mark>
                  <span className="text-gray-400">{inc.contexto.posterior}...</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={`font-medium ${inc.tipo === 'NEGACION' ? 'text-green-600' : 'text-red-600'}`}>
                    {inc.tipo === 'NEGACION' ? '✔️ Mención Negativa (Ej: No padece / Sin alergias)' : '⚠️ Mención Positiva Confirmada'}
                  </span>
                  <button className="text-blue-600 hover:underline">Ver Coordenadas PDF Original</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
