import { useState, useEffect } from 'react';
import { getDb } from '../db';
import { procesarYGuardarDocumento } from '../services/dbServices';

export default function DocumentManager({ onUpdateStats }) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ step: '', value: 0 });

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
            step: p.step === 'hashing' ? 'Calculando Integridad (SHA-256)' : 'Procesando Visión OCR (Tesseract)',
            value: typeof p.progress === 'number' ? Math.round(p.progress * 100) : 100
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
       db.exec(`UPDATE documentos SET categoria_sugerida = '${nuevaCategoria}' WHERE id = ${id}`);
       // TODO: Save to 'human-in-the-loop' preference table to remember this correction for future
       fetchDocuments();
     } catch (e) {
       console.error("Error corrigiendo categoría:", e);
     }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-semibold">Gestión de Expedientes</h2>

        <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow cursor-pointer transition-colors relative">
          Subir Documentos (Air-gapped)
          <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          {uploading && (
            <div className="absolute top-12 right-0 bg-white border p-3 rounded shadow-lg w-64 text-sm text-gray-800 z-10">
              <p className="font-semibold mb-1">{progress.step}</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress.value}%` }}></div>
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Fecha Heurística</th>
              <th className="px-4 py-3">Categoría (Etiqueta)</th>
              <th className="px-4 py-3">Integridad (SHA-256)</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-6 text-gray-500">No hay documentos indexados. Sube una imagen escaneada.</td></tr>
            ) : documents.map(doc => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                <td className="px-4 py-3">{doc.date || 'Desconocida/Pendiente'}</td>
                <td className="px-4 py-3">
                  <select
                    value={doc.category}
                    onChange={(e) => handleCorrection(doc.id, e.target.value)}
                    className={`border rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none ${doc.category === 'Desconocido/Pendiente' ? 'border-red-400 text-red-700 bg-red-50' : ''}`}
                  >
                    <option value="Cardiologia">Cardiología</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Radiologia">Radiología</option>
                    <option value="Receta Medica">Receta Médica</option>
                    <option value="Desconocido/Pendiente">Pendiente de Revisión</option>
                  </select>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400 truncate max-w-[150px]" title={doc.hash}>
                  {doc.hash.substring(0, 16)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
