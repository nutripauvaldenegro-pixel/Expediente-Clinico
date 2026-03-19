import { useState, useEffect } from 'react';
import { getDb } from '../db';
import { procesarYGuardarDocumento, eliminarDocumento } from '../services/dbServices';
import { FileUp, Search, Calendar, Tag, ShieldAlert, CheckCircle2, ChevronRight, File, Activity, FileText, Trash2 } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';

export default function DocumentManager({ onUpdateStats }) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ step: '', value: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);

  const fetchDocuments = () => {
    try {
      const db = getDb();
      const res = db.exec("SELECT id, nombre_archivo, categoria_sugerida, fecha_principal, hash_sha256 FROM documentos ORDER BY id DESC LIMIT 50");
      if (res.length > 0) {
        setDocuments(res[0].values.map(v => ({
          id: v[0], name: v[1], category: v[2], date: v[3], hash: v[4]
        })));
      } else {
        setDocuments([]);
      }
    } catch (e) {
      console.error("Error fetching docs:", e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    for (const file of files) {
      try {
        await procesarYGuardarDocumento(file, (p) => {
          setProgress({
            step: p.step,
            value: typeof p.progress === 'number' ? Math.round(p.progress) : 100
          });
        });
      } catch (err) {
        alert(`Error con archivo ${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
    setProgress({ step: '', value: 0 });
    fetchDocuments();
    onUpdateStats();
  };

  const handleCorrection = async (id, nuevaCategoria) => {
     try {
       const db = getDb();
       // Use parameterized query to prevent SQL injection issues
       db.run(`UPDATE documentos SET categoria_sugerida = ? WHERE id = ?`, [nuevaCategoria, id]);

       // Human-in-the-loop (HITL) Logic
       // En un sistema real, extraeríamos la entidad (ej. Médico o Clínica).
       // Aquí usamos el nombre del archivo sin extensión como "huella" o token para recordar.
       const stmt = db.prepare(`SELECT nombre_archivo FROM documentos WHERE id = ?`);
       stmt.bind([id]);
       const stepRes = stmt.step();

       if (stepRes) {
         const docRes = stmt.getAsObject();
         let fileName = docRes.nombre_archivo;
         // Simplificación: Guardamos una palabra clave del nombre para aplicar la regla en el futuro
         let baseName = fileName.split('.')[0].substring(0, 10).toLowerCase();

         if (baseName.length > 3) {
           db.run(`INSERT OR REPLACE INTO memoria_human_in_the_loop (palabra_clave, categoria_asignada) VALUES (?, ?)`, [baseName, nuevaCategoria]);
           const resdb = await import('../db');
           await resdb.saveDb();
         }
       }
       stmt.free();

       fetchDocuments();
     } catch (e) {
       console.error("Error corrigiendo categoría:", e);
     }
  };

  const handleDelete = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el documento "${nombre}"? Esta acción borrará el archivo original y los datos OCR indexados de la base de datos local.`)) {
      try {
        await eliminarDocumento(id);
        fetchDocuments();
        onUpdateStats();
      } catch (err) {
        alert(`No se pudo eliminar el documento: ${err.message}`);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isPending = doc.category === 'Desconocido/Pendiente' || !doc.date;
    if (showPendingOnly) return matchesSearch && isPending;
    return matchesSearch;
  });

  const pendingCount = documents.filter(doc => doc.category === 'Desconocido/Pendiente' || !doc.date).length;

  const CategoryBadge = ({ category, docId }) => {
    const isPending = category === 'Desconocido/Pendiente';
    const colorClass = isPending
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

    return (
      <select
        value={category}
        onChange={(e) => handleCorrection(docId, e.target.value)}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass} focus:ring-2 focus:ring-indigo-500 outline-none transition-colors cursor-pointer hover:shadow-sm`}
      >
        <option value="Cardiologia">Cardiología</option>
        <option value="Laboratorio">Laboratorio</option>
        <option value="Radiologia">Radiología</option>
        <option value="Receta Medica">Receta Médica</option>
        <option value="Desconocido/Pendiente">⚠ Pendiente Revisión</option>
      </select>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Module Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Expediente Digital
            {documents.length > 0 && (
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{documents.length} archivos</span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Sube, visualiza y clasifica documentos médicos de forma segura y sin conexión.</p>
        </div>

        <label className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm font-medium transition-all ${
            uploading
            ? 'bg-indigo-100 text-indigo-700 cursor-wait'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-md active:scale-[0.98]'
          }`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin"></div>
          ) : (
            <FileUp className="w-5 h-5" />
          )}
          {uploading ? 'Procesando...' : 'Cargar Archivo'}
          <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />

          {/* Progress Popover */}
          {uploading && (
            <div className="absolute top-14 right-0 bg-white border border-slate-200 p-4 rounded-xl shadow-xl w-72 text-sm text-slate-800 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-indigo-100 p-1.5 rounded-md"><Activity className="w-4 h-4 text-indigo-600" /></div>
                <p className="font-semibold text-slate-700 leading-none">{progress.step}</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 mt-3">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out relative"
                  style={{ width: `${progress.value}%` }}
                >
                  <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden">
                    <div className="w-full h-full opacity-30 bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] animate-[shimmer_1s_linear_infinite]"></div>
                  </div>
                </div>
              </div>
              <p className="text-right text-xs text-slate-500 mt-1 font-mono font-medium">{progress.value}%</p>
            </div>
          )}
        </label>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre de archivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPendingOnly(!showPendingOnly)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              showPendingOnly
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${showPendingOnly ? 'text-amber-600' : 'text-slate-400'}`} />
            Pendientes de Revisión
            {pendingCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${showPendingOnly ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-3 py-1.5 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            SHA-256 en {documents.length} docs
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto flex-1 bg-white relative">
        <table className="min-w-full text-left text-sm text-slate-600 whitespace-nowrap">
          <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 border-b border-slate-200 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Fecha Extraída</th>
              <th className="px-6 py-4"><span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Etiqueta Heurística</span></th>
              <th className="px-6 py-4">Integridad (Hash)</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <File className="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Sin documentos indexados</h3>
                    <p className="text-sm text-slate-500 text-center">Inicia cargando imágenes o PDFs escaneados usando el botón superior. El sistema analizará y extraerá los datos automáticamente.</p>
                  </div>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">No se encontraron resultados para la búsqueda.</td>
              </tr>
            ) : filteredDocs.map(doc => (
              <tr key={doc.id} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-900 truncate max-w-[200px]" title={doc.name}>{doc.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-mono text-xs px-2 py-1 rounded ${doc.date ? 'bg-slate-100 text-slate-700' : 'text-slate-400 italic'}`}>
                    {doc.date || 'Sin fecha clara'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <CategoryBadge category={doc.category} docId={doc.id} />
                </td>
                <td className="px-6 py-4 font-mono text-[10px] text-slate-400 flex items-center gap-1.5" title={doc.hash}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {doc.hash.substring(0, 12)}...
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      className="text-rose-500 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 p-1.5 rounded-md transition-colors"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedDocId(doc.id)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      Ver Documento
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Document Viewer Modal */}
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
