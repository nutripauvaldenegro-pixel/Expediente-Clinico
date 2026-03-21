import { useState, useEffect, useRef } from 'react';
import { X, FileText, Fingerprint, Eye, ZoomIn, ZoomOut, Calendar, Tag, Activity } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Componente externo para renderizar una página del PDF
const PdfPage = ({ pdfDoc, pageNumber, scale }) => {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;

        if (!canvas || isCancelled) return;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport: viewport };

        // Si hay una tarea anterior en progreso, intentamos cancelarla
        if (renderTaskRef.current) {
           renderTaskRef.current.cancel();
        }

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (e) {
        if (e.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}`, e);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return <canvas ref={canvasRef} className="bg-slate-900 shadow-md mb-8 mx-auto block max-w-full rounded" />;
};

// Componente externo para renderizar una miniatura del PDF
const PdfThumbnail = ({ pdfDoc, pageNumber, scale = 0.3 }) => {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;

        if (!canvas || isCancelled) return;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport: viewport };

        if (renderTaskRef.current) {
           renderTaskRef.current.cancel();
        }

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (e) {
        if (e.name !== 'RenderingCancelledException') {
          console.error(`Error rendering thumbnail page ${pageNumber}`, e);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return <canvas ref={canvasRef} className="bg-slate-900 shadow-sm rounded-sm object-contain w-12 h-auto" />;
};

export default function DocumentViewerModal({ documentId, db, onClose }) {
  const [docData, setDocData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null); // Instancia parseada de pdfjsLib
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [activeView, setActiveView] = useState('document'); // 'document' | 'text' | 'metadata'
  const [activePageIdx, setActivePageIdx] = useState(0); // Para navegar metadata paginada

  // Cargar datos del documento de la DB
  useEffect(() => {
    let currentUrl = null;

    if (documentId) {
      try {
        const stmt = db.prepare(`SELECT nombre_archivo, texto_raw, metadata_json, hash_sha256, archivo_blob, archivo_mime, categoria_sugerida FROM documentos WHERE id = ?`);
        stmt.bind([documentId]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          setDocData({
            name: row.nombre_archivo,
            text: row.texto_raw,
            metadata: JSON.parse(row.metadata_json),
            hash: row.hash_sha256,
            mime: row.archivo_mime,
            category: row.categoria_sugerida
          });

          if (row.archivo_blob) {
            if (row.archivo_mime === 'application/pdf') {
              // Preparar arraybuffer y parsear PDF UNA SOLA VEZ
              const data = new Uint8Array(row.archivo_blob);
              pdfjsLib.getDocument({ data }).promise.then(pdf => {
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
              }).catch(err => {
                console.error("Error parsing PDF data", err);
              });
            } else {
              const blob = new Blob([row.archivo_blob], { type: row.archivo_mime || 'application/octet-stream' });
              currentUrl = URL.createObjectURL(blob);
              setFileUrl(currentUrl);
            }
          }
        }
        stmt.free();
      } catch (e) {
        console.error("Error cargando documento para visor", e);
      }
    }

    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      // Limpiar instancia de PDF si cerramos
      setPdfDoc(null);
    };
  }, [documentId, db]);

  if (!docData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-900 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-lg leading-none">{docData.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                <Fingerprint className="w-3.5 h-3.5" />
                {docData.hash}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6">
          <button
            onClick={() => setActiveView('document')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeView === 'document' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-200'}`}
          >
            Ver Documento Original
          </button>
          <button
            onClick={() => setActiveView('text')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeView === 'text' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-200'}`}
          >
            Texto Extraído (OCR)
          </button>
          <button
            onClick={() => setActiveView('metadata')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeView === 'metadata' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-200'}`}
          >
            Información Extraída
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-800/50 relative">

          {activeView === 'document' && (
            <div className="flex-1 bg-slate-700 overflow-auto relative">
              {pdfDoc ? (
                <div className="flex flex-col items-center py-8">
                  <div className="sticky top-4 z-10 flex gap-2 mb-6 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full shadow-md border border-slate-800">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs font-mono text-slate-500 font-medium flex items-center min-w-[3rem] justify-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                  </div>
                  <div className="w-full h-full flex flex-col items-center space-y-12">
                    {Array.from(new Array(numPages || 1), (el, index) => (
                       <div key={`page_wrapper_${index + 1}`} className="flex flex-col items-center w-full relative">
                         <div className="bg-slate-800 text-slate-50 text-[10px] font-bold font-mono tracking-wider px-3 py-1 rounded-full shadow-lg mb-3 z-10">
                           PÁGINA {index + 1} DE {numPages || 1}
                         </div>
                         <PdfPage pdfDoc={pdfDoc} pageNumber={index + 1} scale={scale} />
                       </div>
                    ))}
                  </div>
                </div>
              ) : fileUrl ? (
                <div className="flex justify-center items-start h-full p-4">
                  <img src={fileUrl} alt="Document Original" className="max-w-full object-contain shadow-sm bg-slate-900" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 italic p-4">Documento original no disponible en base de datos.</div>
              )}
            </div>
          )}

          {activeView === 'text' && (
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm text-slate-600 leading-relaxed whitespace-pre-wrap selection:bg-indigo-900 selection:text-indigo-100 bg-slate-900">
              {docData.text || <span className="text-slate-500 italic">No se pudo extraer texto inteligible de este documento.</span>}
            </div>
          )}

          {activeView === 'metadata' && (
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 max-w-5xl mx-auto w-full bg-slate-900">

              {/* Selector de página para metadatos granulares con miniatura */}
              {docData.metadata?.paginas_granulares && docData.metadata.paginas_granulares.length > 1 && (
                <div className="w-full md:w-72 shrink-0 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Navegador de Páginas</h4>
                  {docData.metadata.paginas_granulares.map((pag, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePageIdx(idx)}
                      className={`w-full text-left p-3 flex items-center gap-3 rounded-xl border text-sm transition-all ${activePageIdx === idx ? 'bg-indigo-900/40 border-indigo-800 shadow-sm ring-1 ring-indigo-200' : 'bg-slate-900 border-slate-800 hover:bg-slate-950'}`}
                    >
                      {/* Miniatura (si es PDF) o icono genérico */}
                      <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center overflow-hidden border border-slate-700 shrink-0 shadow-inner">
                        {pdfDoc ? (
                           <PdfThumbnail pdfDoc={pdfDoc} pageNumber={pag.pageNumber} />
                        ) : (
                           <FileText className="w-5 h-5 text-slate-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm ${activePageIdx === idx ? 'text-indigo-100' : 'text-slate-200'}`}>
                          Página {pag.pageNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate uppercase tracking-wider font-semibold">
                          {pag.categoria}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                          {pag.fecha || 'Sin fecha'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Data del panel central */}
              {docData.metadata?.paginas_granulares && docData.metadata.paginas_granulares[activePageIdx] ? (() => {
                const pag = docData.metadata.paginas_granulares[activePageIdx];
                return (
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-100">{docData.category || pag.categoria}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-4 h-4" /> {pag.fecha || 'Fecha desconocida'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confianza OCR</div>
                        <div className={`text-lg font-bold font-mono ${pag.confidence > 80 ? 'text-emerald-600' : pag.confidence > 50 ? 'text-amber-400' : 'text-rose-600'}`}>
                          {Math.round(pag.confidence)}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Entidades Clínicas Detectadas
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                        {/* Síntomas */}
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col hover:border-rose-500/50 transition-colors shadow-sm">
                          <h5 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span> Síntomas
                          </h5>
                          <div className="flex flex-wrap gap-1.5 flex-1 content-start">
                            {pag.entidades?.sintomas?.length > 0 ? (
                              pag.entidades.sintomas.map((ent, i) => (
                                <span key={i} className="bg-slate-900/80 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : pag.entidades?.sintomas_y_diagnosticos?.length > 0 ? (
                              pag.entidades.sintomas_y_diagnosticos.map((ent, i) => (
                                <span key={`leg-${i}`} className="bg-slate-900/80 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : <span className="text-xs text-slate-500 italic">No se detectaron.</span>}
                          </div>
                        </div>

                        {/* Diagnósticos */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex flex-col hover:border-purple-500/50 transition-colors shadow-sm">
                          <h5 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span> Diagnósticos
                          </h5>
                          <div className="flex flex-wrap gap-1.5 flex-1 content-start">
                            {pag.entidades?.diagnosticos?.length > 0 ? (
                              pag.entidades.diagnosticos.map((ent, i) => (
                                <span key={i} className="bg-slate-900/80 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : <span className="text-xs text-slate-500 italic">No se detectaron.</span>}
                          </div>
                        </div>

                        {/* Medicamentos */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col hover:border-emerald-500/50 transition-colors shadow-sm">
                          <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Farmacología
                          </h5>
                          <div className="flex flex-wrap gap-1.5 flex-1 content-start">
                            {pag.entidades?.medicamentos?.length > 0 ? (
                              pag.entidades.medicamentos.map((ent, i) => (
                                <span key={i} className="bg-slate-900/80 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : pag.entidades?.medicamentos_y_tratamientos?.length > 0 ? (
                              pag.entidades.medicamentos_y_tratamientos.map((ent, i) => (
                                <span key={`leg-${i}`} className="bg-slate-900/80 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : <span className="text-xs text-slate-500 italic">No se detectaron.</span>}
                          </div>
                        </div>

                        {/* Tratamientos */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col hover:border-amber-500/50 transition-colors shadow-sm">
                          <h5 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span> Tratamientos
                          </h5>
                          <div className="flex flex-wrap gap-1.5 flex-1 content-start">
                            {pag.entidades?.tratamientos?.length > 0 ? (
                              pag.entidades.tratamientos.map((ent, i) => (
                                <span key={i} className="bg-slate-900/80 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : <span className="text-xs text-slate-500 italic">No se detectaron.</span>}
                          </div>
                        </div>

                        {/* Exámenes */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex flex-col hover:border-blue-500/50 transition-colors shadow-sm">
                          <h5 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> Exámenes
                          </h5>
                          <div className="flex flex-wrap gap-1.5 flex-1 content-start">
                            {pag.entidades?.examenes?.length > 0 ? (
                              pag.entidades.examenes.map((ent, i) => (
                                <span key={i} className="bg-slate-900/80 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : pag.entidades?.procedimientos_y_examenes?.length > 0 ? (
                              pag.entidades.procedimientos_y_examenes.map((ent, i) => (
                                <span key={`leg-${i}`} className="bg-slate-900/80 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : <span className="text-xs text-slate-500 italic">No se detectaron.</span>}
                          </div>
                        </div>

                        {/* Procedimientos */}
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex flex-col hover:border-cyan-500/50 transition-colors shadow-sm">
                          <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span> Procedimientos
                          </h5>
                          <div className="flex flex-wrap gap-1.5 flex-1 content-start">
                            {pag.entidades?.procedimientos?.length > 0 ? (
                              pag.entidades.procedimientos.map((ent, i) => (
                                <span key={i} className="bg-slate-900/80 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded text-[11px] font-medium shadow-sm backdrop-blur-sm">{ent}</span>
                              ))
                            ) : <span className="text-xs text-slate-500 italic">No se detectaron.</span>}
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                );
              })() : (
                <div className="text-center p-12 text-slate-500 w-full">Metadatos estructurados antiguos. Elimine e indexe de nuevo el documento.</div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
