const initSqlJs = require('sigem/node_modules/sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();
  db.run("CREATE TABLE test (id INTEGER, b BLOB)");
  const uint8 = new Uint8Array([1, 2, 3, 4]);
  db.run("INSERT INTO test (id, b) VALUES (?, ?)", [1, uint8]);

  const stmt = db.prepare("SELECT b FROM test WHERE id = 1");
  stmt.step();
  const obj = stmt.getAsObject();
  console.log("Blob exists:", !!obj.b, "Length:", obj.b ? obj.b.length : null);
});
