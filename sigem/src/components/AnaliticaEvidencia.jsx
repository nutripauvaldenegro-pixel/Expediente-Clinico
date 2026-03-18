import { useState, useEffect } from 'react';
import { getDb } from '../db';
import { Search, History, Activity, AlertOctagon, CheckCircle2, ChevronRight, FileText, CornerDownRight, Clock } from 'lucide-react';

export default function AnaliticaEvidencia() {
  const [activeTab, setActiveTab] = useState('inconsistencies'); // 'inconsistencies' | 'times'
  const [inconsistencias, setInconsistencias] = useState([]);
  const [tiempos, setTiempos] = useState([]);
  const [termino, setTermino] = useState('alergia');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (activeTab === 'times') {
      cargarTiempos();
    }
  }, [activeTab]);

  const cargarTiempos = () => {
    try {
      const db = getDb();
      const eventos = db.exec(`
        SELECT e.descripcion_hito, e.fecha_evento, d.nombre_archivo
        FROM eventos_cronologia e
        JOIN documentos d ON e.documento_id = d.id
        ORDER BY e.fecha_evento ASC
      `);

      if (!eventos.length) {
        setTiempos([]);
        return;
      }

      setTiempos(eventos[0].values.map(row => ({
        hito: row[0],
        fecha: row[1],
        archivo: row[2]
      })));
    } catch (error) {
      console.error("Error cargando tiempos:", error);
    }
  };

  const handleBuscar = () => {
    try {
      setHasSearched(true);
      const db = getDb();
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

        const tieneTermino = terminoRegex.test(texto);
        const tieneNegacion = negacionRegex.test(texto);

        if (tieneTermino || tieneNegacion) {
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-6 pt-6 border-b border-slate-200 bg-white flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Centro de Auditoría y Analítica
          </h2>
          <p className="text-sm text-slate-500 mt-1">Generación de evidencia para reclamos, historial cronológico e inconsistencias.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mt-2">
          <button
            onClick={() => setActiveTab('inconsistencies')}
            className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'inconsistencies' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Matriz de Inconsistencias
            {activeTab === 'inconsistencies' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
          <button
            onClick={() => setActiveTab('times')}
            className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'times' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Reporte de Tiempos de Respuesta
            {activeTab === 'times' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {/* Conditional Content based on active tab */}
      {activeTab === 'inconsistencies' ? (
        <>
          {/* Search Console */}
          <div className="p-6 bg-indigo-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-800 opacity-50 blur-3xl mix-blend-screen pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <label className="block text-sm font-medium text-indigo-200 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Término clínico a investigar (Ej. Alergia, Diabetes, Asma)
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="w-full bg-indigo-950/50 border border-indigo-700/50 rounded-xl py-3 pl-4 pr-10 text-white placeholder-indigo-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all shadow-inner font-medium text-lg"
                placeholder="Ingresa un diagnóstico o síntoma..."
              />
            </div>
            <button
              onClick={handleBuscar}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <History className="w-5 h-5" />
              Auditar Historial
            </button>
          </div>
          <p className="text-xs text-indigo-300 mt-3 font-medium flex items-center gap-1.5 opacity-80">
            <AlertOctagon className="w-3.5 h-3.5" />
            El sistema buscará coincidencias exactas y negaciones (ej: "sin", "no hay", "niega") en todos los documentos indexados localmente.
          </p>
        </div>
      </div>

      {/* Results Area */}
      <div className="p-6 flex-1 bg-slate-50 overflow-y-auto">
        {!hasSearched ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 max-w-md mx-auto text-center py-12">
             <div className="bg-slate-200/50 p-4 rounded-full mb-4">
               <Search className="w-12 h-12 text-slate-300" />
             </div>
             <p className="font-medium text-slate-600 mb-2">Inicia una auditoría</p>
             <p className="text-sm">Busca un término arriba para analizar el historial clínico completo y detectar contradicciones cronológicas en el expediente.</p>
           </div>
        ) : inconsistencias.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center max-w-lg mx-auto shadow-sm">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 mb-2">No se detectaron menciones</h3>
            <p className="text-emerald-700 text-sm">El término <span className="font-bold bg-emerald-200 px-1 rounded">"{termino}"</span> no aparece en el historial clínico actual. No hay inconsistencias registradas.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200">
                {inconsistencias.length} menciones
              </span>
              <h3 className="text-lg font-bold text-slate-800">Línea de Tiempo del Diagnóstico</h3>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
              {inconsistencias.map((inc, i) => {
                const isNegation = inc.tipo === 'NEGACION';
                return (
                  <div key={i} className="relative pl-6 sm:pl-8 group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-4 ring-white ${isNegation ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                    <div className={`bg-white rounded-xl shadow-sm border transition-shadow hover:shadow-md ${isNegation ? 'border-emerald-100 hover:border-emerald-300' : 'border-rose-100 hover:border-rose-300'}`}>
                      {/* Card Header */}
                      <div className={`px-4 py-3 border-b flex justify-between items-center rounded-t-xl ${isNegation ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-800 text-sm">{inc.nombre}</span>
                        </div>
                        <span className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-600 font-medium shadow-sm flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-slate-400" />
                          {inc.fecha || 'Fecha desconocida'}
                        </span>
                      </div>

                      {/* Context View */}
                      <div className="p-4">
                        <div className="relative font-mono text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner">
                          <CornerDownRight className="w-4 h-4 absolute top-4 left-2 text-slate-300" />
                          <div className="pl-4 leading-relaxed tracking-tight">
                            <span className="opacity-60">...{inc.contexto.previo}</span>
                            <mark className={`font-bold px-1.5 py-0.5 mx-0.5 rounded shadow-sm text-white ${isNegation ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                              {inc.contexto.match}
                            </mark>
                            <span className="opacity-60">{inc.contexto.posterior}...</span>
                          </div>
                        </div>

                        {/* Status Footer */}
                        <div className="mt-4 flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isNegation ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isNegation ? <CheckCircle2 className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
                            {isNegation ? 'Mención Negativa (No padece / Niega)' : 'Mención Positiva (Diagnóstico / Presencia)'}
                          </span>

                          <button className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver PDF Original <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
        </>
      ) : (
        /* Times Report Tab Content */
        <div className="p-6 flex-1 bg-slate-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tiempos de Atención y Respuesta</h3>
                <p className="text-sm text-slate-500">Cálculo automático de tiempo transcurrido entre orden y resultado.</p>
              </div>
              <button onClick={cargarTiempos} className="text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                Actualizar Reporte
              </button>
            </div>

            {tiempos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No hay eventos cronológicos registrados (Órdenes o Resultados).
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full text-left text-sm text-slate-600 whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Fecha Evento</th>
                      <th className="px-6 py-4">Descripción Hito</th>
                      <th className="px-6 py-4">Documento Origen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tiempos.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-800">{t.fecha}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            t.hito.includes('Orden') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.hito}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={t.archivo}>
                          <FileText className="w-4 h-4 inline mr-2 text-slate-400" />
                          {t.archivo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
