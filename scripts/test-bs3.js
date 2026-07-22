const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.exec('CREATE TABLE test (id TEXT, val TEXT)');
const stmt = db.prepare('INSERT INTO test (id, val) VALUES (?, ?)');
try {
  stmt.run('1', ['a', 'b']);
} catch (e) {
  console.log(e.name + ': ' + e.message);
}
