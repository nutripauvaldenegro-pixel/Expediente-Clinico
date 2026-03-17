import { useEffect, useState } from 'react';
import { initDb, exportDb, importDb, getDb } from './db';
import DocumentManager from './components/DocumentManager';
import AnaliticaEvidencia from './components/AnaliticaEvidencia';
import './index.css';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    initDb().then(() => {
      setDbReady(true);
      updateStats();
    }).catch(console.error);
  }, []);

  const updateStats = () => {
    try {
      const db = getDb();
      const res = db.exec("SELECT COUNT(*) as count FROM documentos");
      if (res.length > 0) {
        setDocsCount(res[0].values[0][0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await importDb(file);
    updateStats();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-700">SIGEM 2.0</h1>
        <p className="text-gray-600">Sistema de Gestión de Expediente Médico Local</p>
      </header>

      <main className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold">Estado de la Base de Datos</h2>
            <p className="text-sm text-gray-500">
              {dbReady ? 'Conectado a SQLite (En memoria / IndexedDB)' : 'Cargando base de datos...'}
            </p>
            <p className="mt-2 text-lg">Documentos indexados: <span className="font-bold">{docsCount}</span></p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={exportDb}
              disabled={!dbReady}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors disabled:opacity-50"
            >
              Exportar DB
            </button>
            <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow cursor-pointer transition-colors">
              Importar DB
              <input type="file" accept=".sqlite,.db" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>

        {dbReady && (
          <>
            <DocumentManager onUpdateStats={updateStats} />
            <AnaliticaEvidencia />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
