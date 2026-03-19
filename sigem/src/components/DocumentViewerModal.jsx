import { useState, useEffect } from 'react';
import { X, FileText, Fingerprint, Eye } from 'lucide-react';

export default function DocumentViewerModal({ documentId, db, onClose }) {
  const [docData, setDocData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [activeView, setActiveView] = useState('document'); // 'document' | 'text' | 'metadata'

  // Cargar datos del documento
  useEffect(() => {
    let currentUrl = null;

    if (documentId) {
      try {
        const stmt = db.prepare(`SELECT nombre_archivo, texto_raw, metadata_json, hash_sha256, archivo_blob, archivo_mime FROM documentos WHERE id = ?`);
        stmt.bind([documentId]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          setDocData({
            name: row.nombre_archivo,
            text: row.texto_raw,
            metadata: JSON.parse(row.metadata_json),
            hash: row.hash_sha256,
            mime: row.archivo_mime
          });

          if (row.archivo_blob) {
            const blob = new Blob([row.archivo_blob], { type: row.archivo_mime || 'application/octet-stream' });
            currentUrl = URL.createObjectURL(blob);
            setFileUrl(currentUrl);
          }
        }
        stmt.free();
      } catch (e) {
        console.error("Error cargando documento para visor", e);
      }
    }

    return () => {
      // Limpiar el Blob URL de memoria al cerrar el modal o cambiar de documento
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [documentId, db]);

  if (!docData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-none">{docData.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                <Fingerprint className="w-3.5 h-3.5" />
                {docData.hash}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveView('document')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeView === 'document' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Ver Documento Original
          </button>
          <button
            onClick={() => setActiveView('text')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeView === 'text' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Texto Extraído (OCR)
          </button>
          <button
            onClick={() => setActiveView('metadata')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeView === 'metadata' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Metadatos Analíticos
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/50">

          {activeView === 'document' && (
            <div className="flex-1 bg-slate-200 p-4 flex justify-center overflow-auto">
              {fileUrl ? (
                docData.mime === 'application/pdf' ? (
                  <iframe src={`${fileUrl}#view=FitH`} className="w-full h-full rounded shadow-sm bg-white" title="PDF Viewer" />
                ) : (
                  <img src={fileUrl} alt="Document Original" className="max-w-full object-contain shadow-sm bg-white" />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 italic">Documento original no disponible en base de datos.</div>
              )}
            </div>
          )}

          {activeView === 'text' && (
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm text-slate-700 leading-relaxed whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-900 bg-white">
              {docData.text || <span className="text-slate-400 italic">No se pudo extraer texto inteligible de este documento.</span>}
            </div>
          )}

          {activeView === 'metadata' && (
            <div className="p-6 overflow-y-auto flex-1 space-y-6 max-w-2xl mx-auto w-full bg-white">

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Puntuación Heurística</h4>
                <div className="space-y-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  {Object.entries(docData.metadata?.puntuaciones_heuristica || {}).map(([cat, score]) => (
                    <div key={cat} className="flex justify-between items-center text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                      <span className="text-slate-700">{cat}</span>
                      <span className={`font-mono font-medium px-2 py-0.5 rounded ${score > 0 ? 'bg-emerald-100 text-emerald-700' : score < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                        {score > 0 ? '+' : ''}{score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Calidad de Visión (OCR)</h4>
                <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${docData.metadata?.ocr_confidence > 80 ? 'bg-emerald-500' : docData.metadata?.ocr_confidence > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${docData.metadata?.ocr_confidence || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-mono font-bold text-slate-700">{Math.round(docData.metadata?.ocr_confidence || 0)}%</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Palabras Indexadas</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 flex items-center justify-between shadow-sm">
                  <span>Coordenadas espaciales guardadas:</span>
                  <span className="font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                    {(() => {
                      try {
                        const coords = JSON.parse(docData.metadata?.coordenadas_json || "[]");
                        // Count all pages
                        if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
                           return coords.reduce((acc, curr) => acc + curr.length, 0);
                        }
                        return coords.length || 0;
                      } catch(e) { return 0; }
                    })()} palabras
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Las coordenadas (x,y) de cada palabra se utilizan internamente para detectar encabezados, firmas y proximidad de fechas sin necesidad de marcadores visuales intrusivos.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
