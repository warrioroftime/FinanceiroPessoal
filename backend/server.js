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
    data TEXT NOT NULL,
    categoria_id INTEGER,
    recorrente INTEGER DEFAULT 0,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    cor TEXT DEFAULT '#1976d2'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS metas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_mes TEXT NOT NULL,
    tipo TEXT NOT NULL,
    valor REAL NOT NULL,
    categoria_id INTEGER,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL
  )`);
});

// Listar todos os lançamentos
app.get('/lancamentos', (req, res) => {
  db.all('SELECT * FROM lancamentos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Adicionar lançamento (com recorrência)
app.post('/lancamentos', (req, res) => {
  const { tipo, descricao, valor, data, categoria_id, recorrente } = req.body;
  db.run(
    'INSERT INTO lancamentos (tipo, descricao, valor, data, categoria_id, recorrente) VALUES (?, ?, ?, ?, ?, ?)',
    [tipo, descricao, valor, data, categoria_id, recorrente ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, tipo, descricao, valor, data, categoria_id, recorrente: recorrente ? 1 : 0 });
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

// Exportar lançamentos, metas e categorias em JSON
app.get('/exportar', (req, res) => {
  db.all('SELECT * FROM lancamentos', [], (err, lancamentos) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT * FROM metas', [], (err2, metas) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.all('SELECT * FROM categorias', [], (err3, categorias) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.setHeader('Content-Disposition', 'attachment; filename="financeiro_exportado.json"');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ lancamentos, metas, categorias }, null, 2));
      });
    });
  });
});

// Importar lançamentos, metas e categorias (espera objeto com arrays)
app.post('/importar', (req, res) => {
  const { lancamentos, metas, categorias } = req.body;
  if (!lancamentos || !Array.isArray(lancamentos) || !metas || !Array.isArray(metas) || !categorias || !Array.isArray(categorias)) {
    return res.status(400).json({ error: 'Formato inválido. Esperado objeto com arrays: { lancamentos, metas, categorias }' });
  }
  // Importar categorias
  const catStmt = db.prepare('INSERT OR IGNORE INTO categorias (id, nome, cor) VALUES (?, ?, ?)');
  categorias.forEach(c => {
    catStmt.run([c.id, c.nome, c.cor || '#1976d2']);
  });
  catStmt.finalize();
  // Importar metas
  const metaStmt = db.prepare('INSERT INTO metas (id, ano_mes, tipo, valor, categoria_id) VALUES (?, ?, ?, ?, ?)');
  metas.forEach(m => {
    metaStmt.run([m.id, m.ano_mes, m.tipo, m.valor, m.categoria_id || null]);
  });
  metaStmt.finalize();
  // Importar lançamentos
  const lancStmt = db.prepare('INSERT INTO lancamentos (id, tipo, descricao, valor, data, categoria_id, recorrente) VALUES (?, ?, ?, ?, ?, ?, ?)');
  lancamentos.forEach(l => {
    lancStmt.run([
      l.id,
      l.tipo,
      l.descricao,
      l.valor,
      l.data,
      l.categoria_id || null,
      l.recorrente ? 1 : 0
    ]);
  });
  lancStmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensagem: 'Importação concluída.' });
  });
});

// CRUD de categorias
app.get('/categorias', (req, res) => {
  db.all('SELECT * FROM categorias', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/categorias', (req, res) => {
  const { nome, cor } = req.body;
  db.run('INSERT INTO categorias (nome, cor) VALUES (?, ?)', [nome, cor || '#1976d2'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, nome, cor: cor || '#1976d2' });
  });
});

app.put('/categorias/:id', (req, res) => {
  const { nome, cor } = req.body;
  db.run('UPDATE categorias SET nome = ?, cor = ? WHERE id = ?', [nome, cor, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/categorias/:id', (req, res) => {
  db.run('DELETE FROM categorias WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// CRUD de metas financeiras
app.get('/metas', (req, res) => {
  db.all('SELECT * FROM metas', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/metas', (req, res) => {
  const { ano_mes, tipo, valor, categoria_id } = req.body;
  db.run('INSERT INTO metas (ano_mes, tipo, valor, categoria_id) VALUES (?, ?, ?, ?)', [ano_mes, tipo, valor, categoria_id || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ano_mes, tipo, valor, categoria_id });
  });
});

app.put('/metas/:id', (req, res) => {
  const { ano_mes, tipo, valor, categoria_id } = req.body;
  db.run('UPDATE metas SET ano_mes = ?, tipo = ?, valor = ?, categoria_id = ? WHERE id = ?', [ano_mes, tipo, valor, categoria_id, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/metas/:id', (req, res) => {
  db.run('DELETE FROM metas WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Rota para registrar novo usuário
app.post('/usuarios', (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }
  db.run('INSERT INTO usuarios (usuario, senha) VALUES (?, ?)', [usuario, senha], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Usuário já existe.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, usuario });
  });
});

// Rota para login de usuário
app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  db.get('SELECT * FROM usuarios WHERE usuario = ? AND senha = ?', [usuario, senha], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    res.json({ id: row.id, usuario: row.usuario });
  });
});

app.listen(PORT, () => {
  console.log(`API backend rodando em http://localhost:${PORT}`);
});
