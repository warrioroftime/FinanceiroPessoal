import { useState, useEffect } from 'react'
import './App.css'
import { Pie, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js'
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

interface Lancamento {
  id: number;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
}

interface Usuario {
  usuario: string;
  senha: string;
}

const USUARIO_PADRAO: Usuario = {
  usuario: 'admin',
  senha: '1234',
};

function App() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverTipo, setDragOverTipo] = useState<null | 'receita' | 'despesa'>(null);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const [aba, setAba] = useState<'lancamentos' | 'graficos'>('lancamentos');
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  // Filtra lançamentos do mês/ano selecionado
  const lancamentosFiltrados = lancamentos.filter(l => {
    const [ano, mes] = l.data.split('-');
    return `${ano}-${mes}` === mesSelecionado;
  });

  const saldo = lancamentosFiltrados.reduce((acc, l) => l.tipo === 'receita' ? acc + l.valor : acc - l.valor, 0);

  // Agrupa receitas e despesas por mês
  const resumoPorMes: Record<string, { receita: number; despesa: number }> = {};
  lancamentos.forEach(l => {
    const [ano, mes] = l.data.split('-');
    const chave = `${ano}-${mes}`;
    if (!resumoPorMes[chave]) resumoPorMes[chave] = { receita: 0, despesa: 0 };
    if (l.tipo === 'receita') resumoPorMes[chave].receita += l.valor;
    else resumoPorMes[chave].despesa += l.valor;
  });

  // Dados para o gráfico de pizza do mês selecionado
  const dadosPizza = {
    labels: ['Receitas', 'Despesas'],
    datasets: [
      {
        data: [
          resumoPorMes[mesSelecionado]?.receita || 0,
          resumoPorMes[mesSelecionado]?.despesa || 0
        ],
        backgroundColor: ['#4caf50', '#d32f2f'],
        borderWidth: 1,
      },
    ],
  };

  // Dados para o gráfico de barras (todos os meses)
  const mesesOrdenados = Object.keys(resumoPorMes).sort()
  const dadosBarra = {
    labels: mesesOrdenados,
    datasets: [
      {
        label: 'Receitas',
        data: mesesOrdenados.map(m => resumoPorMes[m]?.receita || 0),
        backgroundColor: '#4caf50',
      },
      {
        label: 'Despesas',
        data: mesesOrdenados.map(m => resumoPorMes[m]?.despesa || 0),
        backgroundColor: '#d32f2f',
      },
    ],
  }

  useEffect(() => {
    fetch('http://localhost:3001/lancamentos')
      .then(res => res.json())
      .then(data => setLancamentos(data));
  }, []);

  function adicionarLancamento(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !data) return;
    fetch('http://localhost:3001/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, descricao, valor: parseFloat(valor.replace(',', '.')), data })
    })
      .then(res => res.json())
      .then(novo => setLancamentos([...lancamentos, novo]));
    setDescricao('');
    setValor('');
    setData(hoje); // volta para a data de hoje após adicionar
  }

  function removerLancamento(id: number) {
    fetch(`http://localhost:3001/lancamentos/${id}`, { method: 'DELETE' })
      .then(() => setLancamentos(lancamentos.filter(l => l.id !== id)));
  }

  function onDragStart(id: number) {
    setDraggedId(id);
  }

  function onDragOver(e: React.DragEvent, tipo: 'receita' | 'despesa') {
    e.preventDefault();
    setDragOverTipo(tipo);
  }

  function onDragLeave() {
    setDragOverTipo(null);
  }

  function onDrop(tipo: 'receita' | 'despesa') {
    if (draggedId !== null) {
      fetch(`http://localhost:3001/lancamentos/${draggedId}/tipo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      })
        .then(() => setLancamentos(lancamentos.map(l =>
          l.id === draggedId ? { ...l, tipo } : l
        )));
      setDraggedId(null);
      setDragOverTipo(null);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (usuario === USUARIO_PADRAO.usuario && senha === USUARIO_PADRAO.senha) {
      setLogado(true);
      setErroLogin('');
    } else {
      setErroLogin('Usuário ou senha inválidos');
    }
  }

  if (!logado) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="formulario login-form">
          <div className="login-form-descricao">Acesse o sistema</div>
          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
          />
          <button type="submit">Entrar</button>
        </form>
        {erroLogin && <div className="erro-login">{erroLogin}</div>}
      </div>
    );
  }

  function sair() {
    setLogado(false);
    setUsuario('');
    setSenha('');
    setErroLogin('');
  }

  return (
    <div className="container">
      <div className="top-bar">
        <button className="btn-sair" onClick={sair}>Sair</button>
      </div>
      <h1>Controle Financeiro Pessoal</h1>
      <div className="abas">
        <button className={aba === 'lancamentos' ? 'aba-ativa' : ''} onClick={() => setAba('lancamentos')}>Lançamentos</button>
        <button className={aba === 'graficos' ? 'aba-ativa' : ''} onClick={() => setAba('graficos')}>Gráficos</button>
      </div>
      {aba === 'lancamentos' && (
        <>
          <div className="filtro-mes">
            <label>
              Mês:&nbsp;
              <input
                type="month"
                value={mesSelecionado}
                onChange={e => setMesSelecionado(e.target.value)}
              />
            </label>
          </div>
          <div className="saldo">
            <strong>Saldo do mês:</strong> R$ {saldo.toFixed(2)}
          </div>
          <form onSubmit={adicionarLancamento} className="formulario">
            <input
              type="text"
              placeholder="Descrição"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
            <input
              type="number"
              placeholder="Valor"
              value={valor}
              onChange={e => setValor(e.target.value)}
              step="0.01"
            />
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
            />
            <select value={tipo} onChange={e => setTipo(e.target.value as 'receita' | 'despesa')}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <button type="submit">Adicionar</button>
          </form>
          <h2>Lançamentos</h2>
          <div className="lancamentos-separadas">
            <div
              className={`lancamentos-col${dragOverTipo === 'receita' ? ' drag-over' : ''}`}
              onDrop={() => onDrop('receita')}
              onDragOver={e => onDragOver(e, 'receita')}
              onDragLeave={onDragLeave}
            >
              <h3>Receitas</h3>
              <ul className="lancamentos">
                {lancamentosFiltrados.filter(l => l.tipo === 'receita').map(l => (
                  <li
                    key={l.id}
                    className={l.tipo}
                    draggable
                    onDragStart={() => onDragStart(l.id)}
                  >
                    <div className="lancamento-info">
                      <span className="lancamento-descricao">{l.descricao}</span>
                      <span className="lancamento-valor">+ R$ {l.valor.toFixed(2)}</span>
                      <span className="lancamento-data">{l.data && new Date(l.data).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => removerLancamento(l.id)} className="remover" title="Remover lançamento">Remover</button>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={`lancamentos-col${dragOverTipo === 'despesa' ? ' drag-over' : ''}`}
              onDrop={() => onDrop('despesa')}
              onDragOver={e => onDragOver(e, 'despesa')}
              onDragLeave={onDragLeave}
            >
              <h3>Despesas</h3>
              <ul className="lancamentos">
                {lancamentosFiltrados.filter(l => l.tipo === 'despesa').map(l => (
                  <li
                    key={l.id}
                    className={l.tipo}
                    draggable
                    onDragStart={() => onDragStart(l.id)}
                  >
                    <div className="lancamento-info">
                      <span className="lancamento-descricao">{l.descricao}</span>
                      <span className="lancamento-valor">- R$ {l.valor.toFixed(2)}</span>
                      <span className="lancamento-data">{l.data && new Date(l.data).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => removerLancamento(l.id)} className="remover" title="Remover lançamento">Remover</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      {aba === 'graficos' && (
        <div className="aba-graficos">
          <div className="filtro-mes">
            <label>
              Mês:&nbsp;
              <input
                type="month"
                value={mesSelecionado}
                onChange={e => setMesSelecionado(e.target.value)}
              />
            </label>
          </div>
          <h2>Receitas x Despesas</h2>
          <div className="grafico-pizza">
            <Pie data={dadosPizza} />
          </div>
          <h2>Receitas e Despesas por Mês</h2>
          <div className="grafico-barra">
            <Bar data={dadosBarra} options={{
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: {
                x: { title: { display: true, text: 'Mês' } },
                y: { title: { display: true, text: 'Valor (R$)' } }
              }
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
