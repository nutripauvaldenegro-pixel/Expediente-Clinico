import { useState, useEffect } from 'react';
import { getDb } from '../db';
import { procesarYGuardarDocumento, eliminarDocumento } from '../services/dbServices';
import { FileUp, Search, Calendar, Tag, ShieldAlert, CheckCircle2, ChevronRight, ChevronDown, File, Activity, FileText, Trash2 } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';

export default function DocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ step: '', value: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const processFiles = async (files) => {
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
  };

  const handleFileUpload = (e) => {
    processFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!uploading && e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
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
      } catch (err) {
        alert(`No se pudo eliminar el documento: ${err.message}`);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = doc.name.toLowerCase().includes(term) || (doc.category && doc.category.toLowerCase().includes(term));
    const isPending = doc.category === 'Desconocido/Pendiente' || !doc.date;
    if (showPendingOnly) return matchesSearch && isPending;
    return matchesSearch;
  });

  const pendingCount = documents.filter(doc => doc.category === 'Desconocido/Pendiente' || !doc.date).length;

  const CategoryBadge = ({ category, docId }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Render component differently for table structure so it breaks out of hidden overflow if any
    // actually, we can append to body or use fixed positioning, but since it's inside a table with responsive scroll, we might need a portal or clever positioning.
    // Given standard Tailwind, if the table has overflow-x-auto, an absolute child might be clipped.

    let colorClass = 'bg-slate-800 text-slate-300 border-slate-700'; // Default
    let label = category;

    const options = [
      { value: 'Atencion Medica', label: 'Atención Médica' },
      { value: 'Reserva de Hora', label: 'Reserva de Hora' },
      { value: 'Resultado de Examen', label: 'Resultado de Examen' },
      { value: 'Orden de Examen', label: 'Orden de Examen' },
      { value: 'Tratamiento', label: 'Tratamiento' },
      { value: 'Informe', label: 'Informe Médico' },
      { value: 'Certificado', label: 'Certificado' },
      { value: 'Receta', label: 'Receta Médica' },
      { value: 'Desconocido/Pendiente', label: '⚠ Pendiente Revisión' }
    ];

    const currentOption = options.find(o => o.value === category);
    if (currentOption) {
      label = currentOption.label;
    }

    switch(category) {
      case 'Atencion Medica': colorClass = 'bg-violet-900/40 text-violet-300 border-violet-800'; break;
      case 'Reserva de Hora': colorClass = 'bg-sky-900/40 text-sky-300 border-sky-800'; break;
      case 'Resultado de Examen': colorClass = 'bg-lime-900/40 text-lime-300 border-lime-800'; break;
      case 'Orden de Examen': colorClass = 'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-800'; break;
      case 'Tratamiento': colorClass = 'bg-orange-900/40 text-orange-300 border-orange-800'; break;
      case 'Informe': colorClass = 'bg-pink-900/40 text-pink-300 border-pink-800'; break;
      case 'Certificado': colorClass = 'bg-amber-900/40 text-amber-300 border-amber-800'; break;
      case 'Receta': colorClass = 'bg-indigo-900/40 text-indigo-300 border-indigo-800'; break;
      case 'Desconocido/Pendiente': colorClass = 'bg-red-900/40 text-red-400 border-red-800 font-bold animate-pulse'; break;
    }

    const handleSelect = (newValue) => {
      handleCorrection(docId, newValue);
      setIsOpen(false);
    };

    return (
      <div className="relative inline-block w-full max-w-[200px]">
        {isOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between text-xs font-semibold px-3 py-1.5 rounded-full border ${colorClass} focus:ring-2 focus:ring-slate-500 outline-none transition-colors cursor-pointer hover:shadow-sm w-full truncate z-40 relative`}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="fixed mt-1 w-[220px] bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-2">
            <ul className="py-1">
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-slate-700 ${
                      category === opt.value ? 'bg-indigo-900/40 text-indigo-300' : 'text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-full bg-slate-900 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-indigo-900/90 backdrop-blur-sm border-4 border-dashed border-indigo-400 rounded-2xl flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="bg-indigo-800/50 p-6 rounded-full mb-4 shadow-xl shadow-indigo-900/50">
             <FileUp className="w-16 h-16 text-indigo-300 animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Suelta los archivos aquí</h2>
          <p className="text-indigo-200 font-medium">Procesaremos los PDF o imágenes automáticamente.</p>
        </div>
      )}

      {/* Module Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            Expediente Digital
            {documents.length > 0 && (
              <span className="text-xs bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-medium">{documents.length} archivos</span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Sube, visualiza y clasifica documentos médicos de forma segura y sin conexión.</p>
        </div>

        <label className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm font-medium transition-all ${
            uploading
            ? 'bg-indigo-900 text-indigo-300 cursor-wait'
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
            <div className="absolute top-14 right-0 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl w-72 text-sm text-slate-200 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-indigo-900 p-1.5 rounded-md"><Activity className="w-4 h-4 text-indigo-400" /></div>
                <p className="font-semibold text-slate-600 leading-none">{progress.step}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-800 mt-3">
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
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o tipo de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPendingOnly(!showPendingOnly)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              showPendingOnly
                ? 'bg-amber-900/40 text-amber-300 border border-amber-700'
                : 'bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-950'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${showPendingOnly ? 'text-amber-400' : 'text-slate-500'}`} />
            Pendientes de Revisión
            {pendingCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${showPendingOnly ? 'bg-amber-900/60 text-amber-200' : 'bg-slate-700 text-slate-500'}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-800 px-3 py-1.5 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            {documents.length} docs
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto flex-1 bg-slate-900 relative">
        <table className="min-w-full text-left text-sm text-slate-500 whitespace-nowrap">
          <thead className="bg-slate-950/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 border-b border-slate-800 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 w-48">Integridad (Hash)</th>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4 w-56"><span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Tipo de Documento</span></th>
              <th className="px-6 py-4 w-32 text-center">Detalle</th>
              <th className="px-6 py-4 w-24 text-center">Eliminar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {documents.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="bg-slate-950 p-4 rounded-full mb-4">
                      <File className="w-12 h-12 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-1">Sin documentos indexados</h3>
                    <p className="text-sm text-slate-500 text-center">Inicia cargando imágenes o PDFs escaneados usando el botón superior. El sistema analizará y extraerá los datos automáticamente.</p>
                  </div>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">No se encontraron resultados para la búsqueda.</td>
              </tr>
            ) : filteredDocs.map(doc => (
              <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 font-mono text-[10px] text-slate-500 flex items-center gap-1.5 mt-1" title={doc.hash}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {doc.hash.substring(0, 12)}...
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded text-slate-400 group-hover:text-indigo-400 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200 truncate max-w-[200px] md:max-w-[300px]" title={doc.name}>{doc.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Subido recientemente</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <CategoryBadge category={doc.category} docId={doc.id} />
                </td>
                <td className="px-6 py-4 text-center">
                   <button
                     onClick={() => setSelectedDocId(doc.id)}
                     className="text-slate-300 hover:text-white bg-slate-800 hover:bg-indigo-600 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm border border-slate-700 inline-flex items-center gap-1.5 w-full justify-center"
                   >
                     Ver Documento
                     <ChevronRight className="w-3 h-3" />
                   </button>
                </td>
                <td className="px-6 py-4 text-center">
                   <button
                     onClick={() => handleDelete(doc.id, doc.name)}
                     className="text-rose-400 hover:text-rose-200 bg-slate-900 hover:bg-rose-600 border border-slate-800 hover:border-rose-500 p-2 rounded-md transition-all shadow-sm w-full inline-flex justify-center items-center"
                     title="Eliminar documento"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
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
