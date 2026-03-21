import { useState, useEffect } from 'react';
import { getDb } from '../db';
import { Search, Filter, Calendar, FileText, Activity, AlertOctagon, Heart, Pill, Stethoscope, ChevronRight } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';

export default function CronologiaClinica() {
  const [eventos, setEventos] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'sintomas' | 'medicamentos' | 'procedimientos'
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Interactive UI State
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

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
              if (!pag.fecha) return;

              const fechaObj = new Date(pag.fecha);
              // Validar fecha real
              if (isNaN(fechaObj.getTime())) return;

              // Para la vista de detalle, no expandimos en 1 evento por entidad.
              // Agrupamos la página entera como 1 hito temporal con toda su metadata rica.
              const noHayEntidades = (!pag.entidades?.sintomas_y_diagnosticos?.length && !pag.entidades?.medicamentos_y_tratamientos?.length && !pag.entidades?.procedimientos_y_examenes?.length);

              // Determinar icono principal y color basado en entidades detectadas
              let mainIcon = FileText;
              let colorCls = 'slate';
              let mainType = 'documento';
              let mainTitle = `Registro: ${pag.categoria}`;

              if (pag.entidades?.sintomas_y_diagnosticos?.length > 0) {
                mainIcon = Heart; colorCls = 'rose'; mainType = 'sintomas'; mainTitle = pag.entidades.sintomas_y_diagnosticos[0];
              } else if (pag.entidades?.medicamentos_y_tratamientos?.length > 0) {
                mainIcon = Pill; colorCls = 'emerald'; mainType = 'medicamentos'; mainTitle = pag.entidades.medicamentos_y_tratamientos[0];
              } else if (pag.entidades?.procedimientos_y_examenes?.length > 0) {
                mainIcon = Stethoscope; colorCls = 'blue'; mainType = 'procedimientos'; mainTitle = pag.entidades.procedimientos_y_examenes[0];
              }

              eventosExtraidos.push({
                docId,
                nombreDoc,
                pageNumber: pag.pageNumber,
                fecha: pag.fecha,
                fechaObj: fechaObj,
                categoriaPagina: pag.categoria,
                tipoEntidad: mainType, // Primary classification for filtering
                entidad: mainTitle, // Primary title
                icono: mainIcon,
                colorCls: colorCls,
                entidadesOriginales: pag.entidades || {},
                confidence: pag.confidence || 0
              });
            });
          }
        } catch(e) {}
      });

      // Ordenar cronológicamente (más nuevo a más antiguo)
      eventosExtraidos.sort((a, b) => b.fechaObj - a.fechaObj);

      setEventos(eventosExtraidos);

      // Expand the first available month by default if any events exist
      if (eventosExtraidos.length > 0) {
        const firstEventMonth = getMonthKey(eventosExtraidos[0].fechaObj);
        setExpandedMonth(firstEventMonth);
      }

    } catch (e) {
      console.error("Error cargando cronología", e);
    }
  };

  const getMonthKey = (fechaObj) => {
    const mes = fechaObj.toLocaleString('es-ES', { month: 'long' });
    const anio = fechaObj.getFullYear();
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
  };

  const eventosFiltrados = eventos.filter(ev => {
    // Para simplificar la búsqueda en el nuevo diseño agrupado,
    // buscaremos en todas las entidades de la página.
    if (filtroTipo !== 'todos') {
       if (filtroTipo === 'sintomas' && !ev.entidadesOriginales.sintomas_y_diagnosticos?.length) return false;
       if (filtroTipo === 'medicamentos' && !ev.entidadesOriginales.medicamentos_y_tratamientos?.length) return false;
       if (filtroTipo === 'procedimientos' && !ev.entidadesOriginales.procedimientos_y_examenes?.length) return false;
    }

    if (filtroTexto) {
      const search = filtroTexto.toLowerCase();
      const textBlock = [
        ev.entidad, ev.categoriaPagina,
        ...(ev.entidadesOriginales.sintomas_y_diagnosticos || []),
        ...(ev.entidadesOriginales.medicamentos_y_tratamientos || []),
        ...(ev.entidadesOriginales.procedimientos_y_examenes || [])
      ].join(' ').toLowerCase();

      if (!textBlock.includes(search)) return false;
    }
    return true;
  });

  // Group filtered events heavily: Month/Year -> Exact Date -> Event List
  const timelineTree = eventosFiltrados.reduce((acc, evento) => {
    const monthKey = getMonthKey(evento.fechaObj);
    const dateKey = evento.fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (!acc[monthKey]) acc[monthKey] = {};
    if (!acc[monthKey][dateKey]) acc[monthKey][dateKey] = [];

    acc[monthKey][dateKey].push(evento);
    return acc;
  }, {});

  const renderBadge = (lista, colorTheme, title) => {
    if (!lista || lista.length === 0) return null;
    return (
      <div className={`bg-${colorTheme}-900/30 border border-${colorTheme}-800/50 rounded-lg p-3 w-full`}>
        <h5 className={`text-[10px] font-bold text-${colorTheme}-400 uppercase tracking-wider mb-2`}>{title}</h5>
        <div className="flex flex-wrap gap-1.5">
          {lista.map((item, i) => (
            <span key={i} className="bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm">{item}</span>
          ))}
        </div>
      </div>
    );
  };

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

      {/* Timeline Layout */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-950">

        {Object.keys(timelineTree).length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl max-w-lg w-full">
              <div className="bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-800">
                <Filter className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">Historial Clínico Vacío</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No hay eventos registrados. Sube documentos en "Gestión de Expedientes" con fechas legibles.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Horizontal Months Timeline (Top Nav for Timeline) */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 overflow-y-auto shrink-0 flex flex-row md:flex-col items-center md:items-stretch py-4 md:py-6 px-2 gap-2">
              {Object.keys(timelineTree).map(mesAnio => (
                <button
                  key={mesAnio}
                  onClick={() => {
                    setExpandedMonth(mesAnio);
                    setSelectedDate(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between border ${
                    expandedMonth === mesAnio
                    ? 'bg-indigo-900/40 border-indigo-800 text-indigo-100 shadow-md ring-1 ring-indigo-500/50'
                    : 'bg-transparent border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-sm tracking-wide capitalize">{mesAnio}</span>
                  {expandedMonth === mesAnio && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                </button>
              ))}
            </div>

            {/* Dates & Events Area for Expanded Month */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
               {expandedMonth && timelineTree[expandedMonth] ? (
                 <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                   {/* Vertical List of Exact Dates */}
                   <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800/50 overflow-y-auto bg-slate-950/50 p-4 space-y-3 shrink-0">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">
                       Eventos en {expandedMonth}
                     </h3>

                     {Object.keys(timelineTree[expandedMonth]).map((fechaExacta, idx) => {
                       const eventosEnFecha = timelineTree[expandedMonth][fechaExacta];
                       const isSelected = selectedDate === fechaExacta;

                       return (
                         <button
                           key={idx}
                           onClick={() => setSelectedDate(isSelected ? null : fechaExacta)}
                           className={`w-full text-left p-4 rounded-xl transition-all duration-300 border shadow-sm group ${
                             isSelected
                             ? 'bg-slate-800 border-indigo-600/50 ring-1 ring-indigo-500/30'
                             : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                           }`}
                         >
                           <div className="flex items-center gap-3 mb-2">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 group-hover:border-slate-500'}`}>
                               <Calendar className="w-4 h-4" />
                             </div>
                             <div>
                               <div className={`font-bold text-sm leading-tight ${isSelected ? 'text-indigo-100' : 'text-slate-300 group-hover:text-slate-100'} capitalize`}>
                                 {fechaExacta.split(',')[0]}
                               </div>
                               <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                 {fechaExacta.split(',')[1]}
                               </div>
                             </div>
                           </div>

                           {/* Mini indicators of what happened */}
                           <div className="pl-11 flex gap-1.5 flex-wrap">
                             {eventosEnFecha.map((ev, i) => {
                               const MiniIcon = ev.icono;
                               return (
                                 <span key={i} className={`bg-${ev.colorCls}-900/30 text-${ev.colorCls}-400 border border-${ev.colorCls}-800/50 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1`}>
                                   <MiniIcon className="w-2.5 h-2.5" />
                                   {ev.categoriaPagina.split(' ')[0]}
                                 </span>
                               );
                             })}
                           </div>
                         </button>
                       );
                     })}
                   </div>

                   {/* Detail View for Selected Date */}
                   <div className="flex-1 overflow-y-auto bg-slate-950 relative p-6">
                      {!selectedDate || !timelineTree[expandedMonth][selectedDate] ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                          <Activity className="w-12 h-12 text-slate-800" />
                          <p className="font-medium text-sm">Selecciona una fecha de la izquierda para ver el detalle de los eventos.</p>
                        </div>
                      ) : (
                        <div className="space-y-8 max-w-3xl mx-auto">
                          <div className="border-b border-slate-800 pb-4">
                            <h2 className="text-2xl font-bold text-slate-100 capitalize">{selectedDate}</h2>
                            <p className="text-slate-500 text-sm mt-1">
                              {timelineTree[expandedMonth][selectedDate].length} evento(s) clínico(s) registrado(s) en esta fecha.
                            </p>
                          </div>

                          {timelineTree[expandedMonth][selectedDate].map((evento, idx) => {
                             const Icono = evento.icono;

                             return (
                               <div key={idx} className={`bg-slate-900 border border-${evento.colorCls}-800/50 rounded-2xl shadow-lg shadow-black/20 overflow-hidden`}>
                                 {/* Header Evento */}
                                 <div className={`bg-${evento.colorCls}-900/20 border-b border-${evento.colorCls}-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                                   <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-xl bg-${evento.colorCls}-600 flex items-center justify-center shrink-0 shadow-lg shadow-${evento.colorCls}-900/50`}>
                                        <Icono className="w-6 h-6 text-white" />
                                     </div>
                                     <div>
                                        <h3 className="text-xl font-bold text-slate-100">{evento.categoriaPagina}</h3>
                                        <p className={`text-sm text-${evento.colorCls}-400 font-medium`}>Confianza OCR: {Math.round(evento.confidence)}%</p>
                                     </div>
                                   </div>

                                   <button
                                     onClick={() => setSelectedDocId(evento.docId)}
                                     className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors border border-slate-700 hover:border-slate-500 shrink-0"
                                   >
                                     <FileText className="w-4 h-4" />
                                     Ver Documento
                                   </button>
                                 </div>

                                 {/* Body Evento (Entidades Extraídas) */}
                                 <div className="p-5 space-y-4">
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                       <Activity className="w-4 h-4" /> Información Extraída Automáticamente
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                       {renderBadge(evento.entidadesOriginales.sintomas_y_diagnosticos, 'rose', 'Motivo de Consulta / Diagnóstico')}
                                       {renderBadge(evento.entidadesOriginales.medicamentos_y_tratamientos, 'emerald', 'Tratamiento / Medicamentos')}
                                       <div className="md:col-span-2">
                                         {renderBadge(evento.entidadesOriginales.procedimientos_y_examenes, 'blue', 'Exámenes / Procedimientos')}
                                       </div>
                                    </div>

                                    {(!evento.entidadesOriginales.sintomas_y_diagnosticos?.length && !evento.entidadesOriginales.medicamentos_y_tratamientos?.length && !evento.entidadesOriginales.procedimientos_y_examenes?.length) && (
                                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-center">
                                        <p className="text-slate-500 text-sm italic">No se detectaron entidades clínicas específicas estructuradas en esta página. Revisa el documento original.</p>
                                      </div>
                                    )}
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      )}
                   </div>
                 </div>
               ) : null}
            </div>
          </>
        )}
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
