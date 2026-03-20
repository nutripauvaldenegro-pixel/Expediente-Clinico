import { useState, useEffect } from 'react';
import { getDb } from '../db';
import { Search, Filter, Calendar, FileText, Activity, AlertOctagon, Heart, Pill, Stethoscope, ChevronRight } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';

export default function CronologiaClinica() {
  const [eventos, setEventos] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'sintomas' | 'medicamentos' | 'procedimientos'
  const [selectedDocId, setSelectedDocId] = useState(null);

  useEffect(() => {
    cargarCronologia();
  }, []);

  const cargarCronologia = () => {
    try {
      const db = getDb();
      const res = db.exec(`SELECT id, nombre_archivo, metadata_json FROM documentos ORDER BY id DESC`);

      if (!res.length) return;

      const eventosExtraidos = [];

      res[0].values.forEach(row => {
        const docId = row[0];
        const nombreDoc = row[1];

        try {
          const metadata = JSON.parse(row[2]);
          if (metadata.paginas_granulares) {
            metadata.paginas_granulares.forEach(pag => {
              // Filtrar páginas sin fecha válida (opcional, pero útil para cronología)
              if (!pag.fecha) return;

              // Expandimos cada entidad encontrada como un evento distinto en la línea de tiempo
              const crearEventos = (lista, tipoOriginal, icono, colorCls) => {
                if (!lista) return;
                lista.forEach(entidad => {
                  eventosExtraidos.push({
                    docId,
                    nombreDoc,
                    pageNumber: pag.pageNumber,
                    fecha: pag.fecha,
                    categoriaPagina: pag.categoria,
                    tipoEntidad: tipoOriginal,
                    entidad: entidad,
                    icono,
                    colorCls
                  });
                });
              };

              crearEventos(pag.entidades?.sintomas_y_diagnosticos, 'sintomas', Heart, 'rose');
              crearEventos(pag.entidades?.medicamentos_y_tratamientos, 'medicamentos', Pill, 'emerald');
              crearEventos(pag.entidades?.procedimientos_y_examenes, 'procedimientos', Stethoscope, 'blue');

              // Si la página no tiene entidades, mostramos al menos un evento "genérico" de documento
              const noHayEntidades = (!pag.entidades?.sintomas_y_diagnosticos?.length && !pag.entidades?.medicamentos_y_tratamientos?.length && !pag.entidades?.procedimientos_y_examenes?.length);

              if (noHayEntidades) {
                eventosExtraidos.push({
                  docId,
                  nombreDoc,
                  pageNumber: pag.pageNumber,
                  fecha: pag.fecha,
                  categoriaPagina: pag.categoria,
                  tipoEntidad: 'documento',
                  entidad: `Registro: ${pag.categoria}`,
                  icono: FileText,
                  colorCls: 'slate'
                });
              }
            });
          }
        } catch(e) {}
      });

      // Ordenar por fecha cronológica (de más antiguo a más nuevo o viceversa)
      // Como las fechas están en formato YYYY-MM-DD o similares, sort string básico funciona la mayoría de las veces
      eventosExtraidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setEventos(eventosExtraidos);
    } catch (e) {
      console.error("Error cargando cronología", e);
    }
  };

  const eventosFiltrados = eventos.filter(ev => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && ev.tipoEntidad !== filtroTipo) return false;

    // Filtro por texto
    if (filtroTexto) {
      const search = filtroTexto.toLowerCase();
      if (!ev.entidad.toLowerCase().includes(search) && !ev.categoriaPagina.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  // Group filtered events by Month and Year
  const eventosAgrupados = eventosFiltrados.reduce((acc, evento) => {
    let fechaObj = new Date(evento.fecha);
    let key = "Fecha no disponible";

    // Valid date check
    if (!isNaN(fechaObj.getTime())) {
      const mes = fechaObj.toLocaleString('es-ES', { month: 'long' });
      const anio = fechaObj.getFullYear();
      key = `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(evento);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Header & Filters */}
      <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-20 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Ficha del Paciente (Cronología Clínica)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Historial estructurado generado automáticamente a partir de todas las páginas de los documentos indexados.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar síntoma, medicamento, examen..."
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-sm"
            />
          </div>

          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-800 overflow-x-auto shrink-0">
            <button onClick={() => setFiltroTipo('todos')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filtroTipo === 'todos' ? 'bg-slate-900 shadow-sm text-slate-200' : 'text-slate-500 hover:text-slate-600'}`}>Todos</button>
            <button onClick={() => setFiltroTipo('sintomas')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filtroTipo === 'sintomas' ? 'bg-rose-900/40 text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}>Síntomas</button>
            <button onClick={() => setFiltroTipo('medicamentos')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filtroTipo === 'medicamentos' ? 'bg-emerald-900/40 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}>Tratamientos</button>
            <button onClick={() => setFiltroTipo('procedimientos')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filtroTipo === 'procedimientos' ? 'bg-blue-900/40 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}>Exámenes</button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto relative">
          {Object.keys(eventosAgrupados).length === 0 ? (
            <div className="text-center py-24 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl mt-10">
              <div className="bg-slate-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-800">
                <Filter className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">Historial Clínico Vacío</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">Sube documentos en "Gestión de Expedientes" y asegúrate de que contengan fechas legibles. Los síntomas y tratamientos extraídos aparecerán aquí estructurados.</p>
            </div>
          ) : (
            <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-slate-700/50 before:to-transparent">

              {Object.entries(eventosAgrupados).map(([mesAnio, eventosGrupo], groupIdx) => (
                <div key={groupIdx} className="relative z-10">
                  {/* Etiqueta de Agrupación (Mes / Año) */}
                  <div className="flex justify-center mb-8 sticky top-20 z-20">
                    <span className="bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-black/20 uppercase tracking-widest backdrop-blur-md">
                      {mesAnio}
                    </span>
                  </div>

                  <div className="space-y-8">
                    {eventosGrupo.map((evento, idx) => {
                      const Icono = evento.icono;

                      return (
                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active transition-all duration-300 hover:-translate-y-1">
                          {/* Timeline Dot */}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-${evento.colorCls}-600 text-white shadow-lg shadow-${evento.colorCls}-900/50 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative left-0 md:left-1/2 transition-transform duration-300 group-hover:scale-110`}>
                            <Icono className="w-4 h-4" />
                          </div>

                          {/* Timeline Card */}
                          <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-800 transition-all duration-300 group-hover:shadow-lg hover:shadow-${evento.colorCls}-900/20 group-hover:border-${evento.colorCls}-800/50`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <time className="text-xs font-bold font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded shadow-inner inline-block">{evento.fecha}</time>
                              <span className={`text-[10px] uppercase tracking-wider font-bold text-${evento.colorCls}-400 bg-${evento.colorCls}-900/30 border border-${evento.colorCls}-800/50 px-2.5 py-1 rounded-full whitespace-nowrap`}>
                                {evento.categoriaPagina}
                              </span>
                            </div>

                            <h4 className="text-lg font-bold text-slate-100 mb-4 capitalize leading-tight">{evento.entidad}</h4>

                            <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wider mb-0.5">Fuente:</span>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="truncate max-w-[140px] sm:max-w-[180px]" title={evento.nombreDoc}>
                                    {evento.nombreDoc}
                                  </span>
                                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">P.{evento.pageNumber}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedDocId(evento.docId)}
                                className={`w-8 h-8 rounded-full bg-slate-950 text-slate-500 flex items-center justify-center transition-all duration-300 border border-slate-800 hover:bg-${evento.colorCls}-900/40 hover:text-${evento.colorCls}-400 hover:border-${evento.colorCls}-800 shrink-0`}
                                title="Ver documento original"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>

      {selectedDocId && (
        <DocumentViewerModal
          documentId={selectedDocId}
          db={getDb()}
          onClose={() => setSelectedDocId(null)}
        />
      )}
    </div>
  );
}
