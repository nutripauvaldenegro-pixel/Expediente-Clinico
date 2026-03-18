import { useEffect, useState } from 'react';
import { initDb, exportDb, importDb, getDb } from './db';
import DocumentManager from './components/DocumentManager';
import AnaliticaEvidencia from './components/AnaliticaEvidencia';
import { Database, Download, Upload, Activity, FileText, ShieldCheck } from 'lucide-react';
import './index.css';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [docsCount, setDocsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'analytics'

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-inner">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SIGEM <span className="text-indigo-600 font-black">2.0</span></h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Air-Gapped Medical Records</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            {dbReady ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-slate-700">Conexión Local Segura</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-700">Inicializando motor...</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">

        {/* Sidebar Navigation & DB Controls */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${
                activeTab === 'documents'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              Gestión de Expedientes
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${
                activeTab === 'analytics'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Activity className="w-5 h-5" />
              Auditoría y Evidencia
            </button>
          </nav>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Almacenamiento (SQLite)
            </h3>

            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-3xl font-light text-slate-800 tracking-tighter">{docsCount}</span>
              <span className="text-sm font-medium text-slate-500">docs indexados</span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={exportDb}
                disabled={!dbReady}
                className="w-full flex justify-center items-center gap-2 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download className="w-4 h-4" />
                Respaldar Base (Export)
              </button>

              <label className={`w-full flex justify-center items-center gap-2 border border-slate-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  !dbReady ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400' : 'bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-700 cursor-pointer'
                }`}
              >
                <Upload className="w-4 h-4" />
                Restaurar (Import)
                <input type="file" accept=".sqlite,.db" className="hidden" onChange={handleImport} disabled={!dbReady} />
              </label>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 text-center leading-tight">
              Los datos se guardan en el navegador. Haz respaldos periódicos.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {dbReady ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {activeTab === 'documents' && <DocumentManager onUpdateStats={updateStats} />}
              {activeTab === 'analytics' && <AnaliticaEvidencia />}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Iniciando Motor WebAssembly</h2>
              <p className="text-slate-500 max-w-md">Cargando base de datos encriptada y modelos heurísticos. Por favor espera, esto ocurre localmente y no consume internet.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
