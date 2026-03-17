import initSqlJs from 'sql.js';
import localforage from 'localforage';

let SQL;
let db;

export const initDb = async () => {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `/sql-wasm.wasm`
    });
  }

  const savedData = await localforage.getItem('sigem_db');

  if (savedData) {
    db = new SQL.Database(new Uint8Array(savedData));
  } else {
    db = new SQL.Database();

    // Create initial schema
    db.run(`
      CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_archivo TEXT,
        hash_sha256 TEXT UNIQUE,
        fecha_principal DATE,
        categoria_sugerida TEXT,
        texto_raw TEXT,
        metadata_json TEXT
      );

      CREATE TABLE IF NOT EXISTS eventos_cronologia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER,
        fecha_evento DATE,
        descripcion_hito TEXT,
        gravedad INTEGER CHECK (gravedad BETWEEN 1 AND 5),
        FOREIGN KEY(documento_id) REFERENCES documentos(id)
      );
    `);

    await saveDb();
  }

  return db;
};

export const saveDb = async () => {
  if (!db) return;
  const data = db.export();
  await localforage.setItem('sigem_db', data);
};

export const getDb = () => {
  if (!db) throw new Error("Database not initialized");
  return db;
};

export const exportDb = async () => {
  if (!db) return null;
  const data = db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sigem_backup.sqlite';
  a.click();
  URL.revokeObjectURL(url);
};

export const importDb = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const uInt8Array = new Uint8Array(e.target.result);
        db = new SQL.Database(uInt8Array);
        await saveDb();
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
