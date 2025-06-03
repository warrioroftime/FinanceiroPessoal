// Backend Express + SQLite para controle financeiro
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'financeiro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data TEXT NOT NULL
  )`);
});

// Listar todos os lançamentos
app.get('/lancamentos', (req, res) => {
  db.all('SELECT * FROM lancamentos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Adicionar lançamento
app.post('/lancamentos', (req, res) => {
  const { tipo, descricao, valor, data } = req.body;
  db.run(
    'INSERT INTO lancamentos (tipo, descricao, valor, data) VALUES (?, ?, ?, ?)',
    [tipo, descricao, valor, data],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, tipo, descricao, valor, data });
    }
  );
});

// Remover lançamento
app.delete('/lancamentos/:id', (req, res) => {
  db.run('DELETE FROM lancamentos WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Atualizar tipo (receita/despesa)
app.patch('/lancamentos/:id/tipo', (req, res) => {
  const { tipo } = req.body;
  db.run('UPDATE lancamentos SET tipo = ? WHERE id = ?', [tipo, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Importar lançamentos em massa (para migração)
app.post('/importar-lancamentos', (req, res) => {
  const lancamentos = req.body;
  if (!Array.isArray(lancamentos)) {
    return res.status(400).json({ error: 'Formato inválido, esperado array de lançamentos.' });
  }
  const stmt = db.prepare('INSERT INTO lancamentos (tipo, descricao, valor, data) VALUES (?, ?, ?, ?)');
  let inseridos = 0;
  lancamentos.forEach(l => {
    stmt.run([l.tipo, l.descricao, l.valor, l.data], err => {
      if (!err) inseridos++;
    });
  });
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensagem: `Importação concluída. ${inseridos} lançamentos inseridos.` });
  });
});

app.listen(PORT, () => {
  console.log(`API backend rodando em http://localhost:${PORT}`);
});
