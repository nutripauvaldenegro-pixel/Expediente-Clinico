import { useEffect, useState } from 'react';
import { initDb, getDb } from './db';
import DocumentManager from './components/DocumentManager';
import CronologiaClinica from './components/CronologiaClinica';
import { Database, Download, Upload, Activity, FileText, ShieldCheck, ListOrdered } from 'lucide-react';
import './index.css';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [docsCount, setDocsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'timeline'

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
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${
                activeTab === 'timeline'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-5 h-5" />
              Cronología Clínica
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {dbReady ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col h-[calc(100vh-8rem)]">
              {activeTab === 'documents' && <DocumentManager onUpdateStats={updateStats} />}
              {activeTab === 'timeline' && <CronologiaClinica />}
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
