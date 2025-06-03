// Script para exportar lançamentos do banco SQLite para JSON
// Salve este arquivo como exportar_lancamentos.js na pasta backend

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('financeiro.db');

// Ajuste o nome da tabela conforme seu banco (ex: lancamentos)
const tabela = 'lancamentos';

// Exporte todos os lançamentos
const query = `SELECT * FROM ${tabela}`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('Erro ao consultar o banco:', err);
    process.exit(1);
  }
  fs.writeFileSync('lancamentos_exportados.json', JSON.stringify(rows, null, 2));
  console.log(`Exportados ${rows.length} lançamentos para lancamentos_exportados.json`);
  db.close();
});
