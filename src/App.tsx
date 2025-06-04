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
  categoria_id?: number;
  recorrente?: number;
}

interface Usuario {
  usuario: string;
  senha: string;
}

interface Categoria {
  id: number;
  nome: string;
  cor: string;
}

interface Meta {
  id: number;
  ano_mes: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria_id?: number | null;
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
  const [aba, setAba] = useState<'lancamentos' | 'graficos' | 'metas' | 'categorias'>('lancamentos');
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [corCategoria, setCorCategoria] = useState('#1976d2');
  const [editandoCategoria, setEditandoCategoria] = useState<Categoria | null>(null);
  // Funções e estados de metas financeiras
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaValor, setMetaValor] = useState('');
  const [metaTipo, setMetaTipo] = useState<'receita' | 'despesa'>('despesa');
  const [metaCategoriaId, setMetaCategoriaId] = useState<number | null>(null);
  const [editandoMeta, setEditandoMeta] = useState<Meta | null>(null);
  const [recorrente, setRecorrente] = useState(false);

  // --- ESTADO DOS FILTROS AVANÇADOS ---
  const [filtroCategoria, setFiltroCategoria] = useState<number | ''>('');
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');

  // --- FILTRAGEM AVANÇADA ---
  const lancamentosFiltrados = lancamentos.filter(l => {
    const [ano, mes] = l.data.split('-');
    if (`${ano}-${mes}` !== mesSelecionado) return false;
    if (filtroCategoria && l.categoria_id !== filtroCategoria) return false;
    if (filtroValorMin && l.valor < parseFloat(filtroValorMin.replace(',', '.'))) return false;
    if (filtroValorMax && l.valor > parseFloat(filtroValorMax.replace(',', '.'))) return false;
    if (filtroTexto && !l.descricao.toLowerCase().includes(filtroTexto.toLowerCase())) return false;
    if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false;
    return true;
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

  // Buscar lançamentos após login
  useEffect(() => {
    if (!logado) return;
    fetch('http://localhost:3001/lancamentos')
      .then(res => res.json())
      .then(data => setLancamentos(data));
  }, [logado]);

  // Buscar categorias após login
  useEffect(() => {
    if (!logado) return;
    fetch('http://localhost:3001/categorias')
      .then(res => res.json())
      .then(data => setCategorias(data));
  }, [logado]);

  // Buscar metas após login
  useEffect(() => {
    if (!logado) return;
    fetch('http://localhost:3001/metas')
      .then(res => res.json())
      .then(data => setMetas(data));
  }, [logado]);

  function adicionarLancamento(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !data) return;
    fetch('http://localhost:3001/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, descricao, valor: parseFloat(valor.replace(',', '.')), data, categoria_id: categoriaId, recorrente: recorrente ? 1 : 0 })
    })
      .then(res => res.json())
      .then(novo => {
        if (novo.error) {
          alert('Erro ao adicionar lançamento: ' + novo.error);
        } else {
          setLancamentos([...lancamentos, novo]);
          setDescricao('');
          setValor('');
          setData(hoje);
          setCategoriaId(null);
          setRecorrente(false);
        }
      })
      .catch(err => alert('Erro de conexão ao adicionar lançamento: ' + err));
  }

  function adicionarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoria) return;
    fetch('http://localhost:3001/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaCategoria, cor: corCategoria })
    })
      .then(res => res.json())
      .then(cat => setCategorias([...categorias, cat]));
    setNovaCategoria('');
    setCorCategoria('#1976d2');
  }

  function removerCategoria(id: number) {
    fetch(`http://localhost:3001/categorias/${id}`, { method: 'DELETE' })
      .then(() => setCategorias(categorias.filter(c => c.id !== id)));
  }

  function editarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoCategoria) return;
    fetch(`http://localhost:3001/categorias/${editandoCategoria.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaCategoria, cor: corCategoria })
    })
      .then(() => {
        setCategorias(categorias.map(c => c.id === editandoCategoria.id ? { ...c, nome: novaCategoria, cor: corCategoria } : c));
        setEditandoCategoria(null);
        setNovaCategoria('');
        setCorCategoria('#1976d2');
      });
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

  const [exibindoCadastro, setExibindoCadastro] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [cadastroErro, setCadastroErro] = useState('');
  const [cadastroSucesso, setCadastroSucesso] = useState('');

  // Função para registrar usuário no backend
  function registrarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!novoUsuario || !novaSenha) {
      setCadastroErro('Preencha todos os campos!');
      setCadastroSucesso('');
      return;
    }
    fetch('http://localhost:3001/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: novoUsuario, senha: novaSenha })
    })
      .then(res => res.json())
      .then(resp => {
        if (resp.error) {
          setCadastroErro(resp.error);
          setCadastroSucesso('');
        } else {
          setCadastroSucesso('Usuário cadastrado com sucesso!');
          setCadastroErro('');
          setNovoUsuario('');
          setNovaSenha('');
        }
      })
      .catch(() => {
        setCadastroErro('Erro de conexão com o servidor.');
        setCadastroSucesso('');
      });
  }

  // Função de login usando backend
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    })
      .then(res => res.json())
      .then(resp => {
        if (resp.error) {
          setErroLogin(resp.error);
        } else {
          setLogado(true);
          setErroLogin('');
        }
      })
      .catch(() => setErroLogin('Erro de conexão com o servidor.'));
  }

  // Função para exportar lançamentos, metas e categorias (JSON)
  function exportarLancamentos() {
    fetch('http://localhost:3001/exportar')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao exportar dados');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financeiro_exportado.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => alert('Erro ao exportar: ' + err.message));
  }

  // Função para importar lançamentos, metas e categorias (JSON)
  function importarLancamentos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = JSON.parse(event.target?.result as string);
        // Suporte ao formato antigo (array) e novo (objeto)
        let body;
        if (Array.isArray(data)) {
          body = JSON.stringify({ lancamentos: data, metas: [], categorias: [] });
        } else {
          body = JSON.stringify(data);
        }
        fetch('http://localhost:3001/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        })
          .then(res => res.json())
          .then(resp => {
            if (resp.error) alert('Erro ao importar: ' + resp.error);
            else {
              alert(resp.mensagem || 'Importação realizada com sucesso!');
              // Atualiza tudo após importar
              fetch('http://localhost:3001/lancamentos')
                .then(res => res.json())
                .then(data => setLancamentos(data));
              fetch('http://localhost:3001/categorias')
                .then(res => res.json())
                .then(data => setCategorias(data));
              fetch('http://localhost:3001/metas')
                .then(res => res.json())
                .then(data => setMetas(data));
            }
          })
          .catch(() => alert('Erro de conexão ao importar.'));
      } catch (err) {
        alert('Arquivo inválido!');
      }
    };
    reader.readAsText(file);
  }

  // --- FUNÇÕES DE METAS FINANCEIRAS ---
  function metasDoMes() {
    return metas.filter(m => m.ano_mes === mesSelecionado);
  }

  function progressoMeta(meta: Meta) {
    let total = 0;
    if (meta.tipo === 'receita') {
      total = lancamentosFiltrados.filter(l => l.tipo === 'receita' && (meta.categoria_id ? l.categoria_id === meta.categoria_id : true)).reduce((acc, l) => acc + l.valor, 0);
    } else {
      total = lancamentosFiltrados.filter(l => l.tipo === 'despesa' && (meta.categoria_id ? l.categoria_id === meta.categoria_id : true)).reduce((acc, l) => acc + l.valor, 0);
    }
    return (total / meta.valor) * 100;
  }

  function adicionarMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!metaValor) return;
    fetch('http://localhost:3001/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ano_mes: mesSelecionado, tipo: metaTipo, valor: parseFloat(metaValor.replace(',', '.')), categoria_id: metaCategoriaId })
    })
      .then(res => res.json())
      .then(meta => {
        setMetas([...metas, meta]);
        setMetaValor('');
        setMetaCategoriaId(null);
        setMetaTipo('despesa');
      });
  }

  function editarMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoMeta) return;
    fetch(`http://localhost:3001/metas/${editandoMeta.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: parseFloat(metaValor.replace(',', '.')), tipo: metaTipo, categoria_id: metaCategoriaId })
    })
      .then(() => {
        setMetas(metas.map(m => m.id === editandoMeta.id ? { ...m, valor: parseFloat(metaValor.replace(',', '.')), tipo: metaTipo, categoria_id: metaCategoriaId } : m));
        setEditandoMeta(null);
        setMetaValor('');
        setMetaCategoriaId(null);
        setMetaTipo('despesa');
      });
  }

  function removerMeta(id: number) {
    fetch(`http://localhost:3001/metas/${id}`, { method: 'DELETE' })
      .then(() => setMetas(metas.filter(m => m.id !== id)));
  }

  if (!logado) {
    return (
      <div className="login-container">
        {!exibindoCadastro ? (
          <form onSubmit={handleLogin} className="login-form">
            {/* Logo ou texto estilizado */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Logo" className="login-logo" />
            </div>
            {/* Bandeiras de idioma (apenas visual) */}
            <div className="login-flags">
              <img src="https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/br.svg" alt="Português" title="Português" />
              <img src="https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/us.svg" alt="English" title="English" />
              <img src="https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/es.svg" alt="Español" title="Español" />
            </div>
            <div className="login-title">Bem-vindo(a)</div>
            <div className="login-form-group">
              <div className="login-input-wrapper">
                <span className="login-input-icon">📧</span>
                <input
                  type="text"
                  placeholder="Usuário"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
              </div>
            </div>
            <div className="login-checkbox">
              <input type="checkbox" id="salvarSenha" style={{ marginRight: 4 }} />
              <label htmlFor="salvarSenha" style={{ color: '#1976d2', fontSize: 15 }}>Salvar senha</label>
            </div>
            <div className="login-register" onClick={() => { setExibindoCadastro(true); setCadastroErro(''); setCadastroSucesso(''); }}>Registre-se, agora mesmo!</div>
            <button type="submit">ENTRAR</button>
          </form>
        ) : (
          <form onSubmit={registrarUsuario} className="login-form">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Logo" className="login-logo" />
            </div>
            <div className="login-title">Cadastro de Usuário</div>
            <div className="login-form-group">
              <div className="login-input-wrapper">
                <span className="login-input-icon">📧</span>
                <input
                  type="text"
                  placeholder="Novo usuário"
                  value={novoUsuario}
                  onChange={e => setNovoUsuario(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                />
              </div>
            </div>
            <button type="submit">Cadastrar</button>
            <div className="login-register" onClick={() => setExibindoCadastro(false)} style={{ color: '#1976d2', textAlign: 'center', cursor: 'pointer', marginTop: 8 }}>Voltar para login</div>
            {cadastroErro && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 4 }}>{cadastroErro}</div>}
            {cadastroSucesso && <div style={{ color: '#4caf50', fontSize: 14, marginTop: 4 }}>{cadastroSucesso}</div>}
          </form>
        )}
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
    <div className={logado ? "container dashboard-bg" : "container"}>
      <div className="top-bar">
        <button className="btn-sair" onClick={sair}>Sair</button>
      </div>
      <div className="export-import-bar">
        <button onClick={exportarLancamentos}>Exportar lançamentos (JSON)</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
          <span>Importar lançamentos</span>
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importarLancamentos} />
        </label>
      </div>
      <h1 style={{ marginBottom: 18 }}>Controle Financeiro Pessoal</h1>
      <div className="abas">
        <button className={aba === 'lancamentos' ? 'aba-ativa' : ''} onClick={() => setAba('lancamentos')}>Lançamentos</button>
        <button className={aba === 'metas' ? 'aba-ativa' : ''} onClick={() => setAba('metas')}>Metas do mês</button>
        <button className={aba === 'categorias' ? 'aba-ativa' : ''} onClick={() => setAba('categorias')}>Categorias</button>
        <button className={aba === 'graficos' ? 'aba-ativa' : ''} onClick={() => setAba('graficos')}>Gráficos</button>
      </div>
      {aba === 'lancamentos' && (
        <>
          <div className="secao">
            <div className="secao-titulo">Filtros avançados</div>
            <div className="filtros-avancados">
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Todas categorias</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}>
                <option value="todos">Todos</option>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
              <input
                type="number"
                placeholder="Valor mínimo"
                value={filtroValorMin}
                onChange={e => setFiltroValorMin(e.target.value)}
              />
              <input
                type="number"
                placeholder="Valor máximo"
                value={filtroValorMax}
                onChange={e => setFiltroValorMax(e.target.value)}
              />
              <input
                type="text"
                placeholder="Buscar descrição"
                value={filtroTexto}
                onChange={e => setFiltroTexto(e.target.value)}
              />
              <button type="button" onClick={() => {
                setFiltroCategoria('');
                setFiltroValorMin('');
                setFiltroValorMax('');
                setFiltroTexto('');
                setFiltroTipo('todos');
              }}>Limpar filtros</button>
            </div>
          </div>
          <div className="secao">
            <div className="secao-titulo">Lançamentos do mês</div>
            <div className="filtro-mes" style={{ marginBottom: 18 }}>
              <label>
                Mês:&nbsp;
                <input
                  type="month"
                  value={mesSelecionado}
                  onChange={e => setMesSelecionado(e.target.value)}
                />
              </label>
            </div>
            <div className="saldo" style={{ color: saldo < 0 ? '#ff5252' : '#fff', fontWeight: saldo < 0 ? 'bold' : undefined, marginBottom: 18 }}>
              <strong>Saldo do mês:</strong> R$ {saldo.toFixed(2)}
              {saldo < 0 && <span style={{ color: '#ff5252', marginLeft: 10, fontWeight: 'bold' }}>Atenção: saldo negativo!</span>}
            </div>
            <form onSubmit={adicionarLancamento} className="formulario" style={{ marginBottom: 18 }}>
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
              <select value={categoriaId ?? ''} onChange={e => setCategoriaId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Categoria</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
              <div className="formulario-final">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={recorrente}
                    onChange={e => setRecorrente(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{marginLeft: 2}}>Recorrente</span>
                </label>
                <button type="submit">Adicionar</button>
              </div>
            </form>
            <h2 style={{ margin: '1.2rem 0 0.7rem 0', color: '#4caf50', fontSize: '1.18rem' }}>Lançamentos</h2>
            <div className="lancamentos-separadas">
              <div
                className={`lancamentos-col receitas-col${dragOverTipo === 'receita' ? ' drag-over' : ''}`}
                onDrop={() => onDrop('receita')}
                onDragOver={e => onDragOver(e, 'receita')}
                onDragLeave={onDragLeave}
              >
                <h3 className="lancamentos-col-titulo receitas-titulo">
                  <span className="lancamentos-col-icone">💰</span> Receitas
                  <span className="lancamentos-col-total receitas-total">
                    R$ {lancamentosFiltrados.filter(l => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </h3>
                <ul className="lancamentos">
                  {lancamentosFiltrados.filter(l => l.tipo === 'receita').map(l => {
                    const cat = categorias.find(c => c.id === l.categoria_id);
                    return (
                      <li
                        key={l.id}
                        className={l.tipo + ' lancamento-card animated-card'}
                        draggable
                        onDragStart={() => onDragStart(l.id)}
                        style={l.recorrente ? { border: '2px dashed #1976d2', background: '#232f3a' } : {}}
                        title={l.recorrente ? 'Lançamento recorrente' : ''}
                      >
                        <div className="lancamento-info">
                          <span className="lancamento-icone" aria-label="Receita" title="Receita">💰</span>
                          <span className="lancamento-descricao">
                            {l.descricao} {l.recorrente ? <span style={{ fontSize: 14, color: '#1976d2', marginLeft: 4 }} title="Recorrente">🔁</span> : null}
                          </span>
                          <span className="lancamento-valor">+ R$ {l.valor.toFixed(2)}</span>
                          <span className="lancamento-data">{l.data && new Date(l.data).toLocaleDateString()}</span>
                          {cat && <span style={{ background: cat.cor, color: '#fff', borderRadius: 4, padding: '0 6px', fontSize: 13 }}>{cat.nome}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => removerLancamento(l.id)} className="remover" title="Remover lançamento">Remover</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div
                className={`lancamentos-col despesas-col${dragOverTipo === 'despesa' ? ' drag-over' : ''}`}
                onDrop={() => onDrop('despesa')}
                onDragOver={e => onDragOver(e, 'despesa')}
                onDragLeave={onDragLeave}
              >
                <h3 className="lancamentos-col-titulo despesas-titulo">
                  <span className="lancamentos-col-icone">💸</span> Despesas
                  <span className="lancamentos-col-total despesas-total">
                    R$ {lancamentosFiltrados.filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </h3>
                <ul className="lancamentos">
                  {lancamentosFiltrados.filter(l => l.tipo === 'despesa').map(l => {
                    const cat = categorias.find(c => c.id === l.categoria_id);
                    return (
                      <li
                        key={l.id}
                        className={l.tipo + ' lancamento-card animated-card'}
                        draggable
                        onDragStart={() => onDragStart(l.id)}
                        style={l.recorrente ? { border: '2px dashed #1976d2', background: '#2f2323' } : {}}
                        title={l.recorrente ? 'Lançamento recorrente' : ''}
                      >
                        <div className="lancamento-info">
                          <span className="lancamento-icone" aria-label="Despesa" title="Despesa">💸</span>
                          <span className="lancamento-descricao">
                            {l.descricao} {l.recorrente ? <span style={{ fontSize: 14, color: '#1976d2', marginLeft: 4 }} title="Recorrente">🔁</span> : null}
                          </span>
                          <span className="lancamento-valor">- R$ {l.valor.toFixed(2)}</span>
                          <span className="lancamento-data">{l.data && new Date(l.data).toLocaleDateString()}</span>
                          {cat && <span style={{ background: cat.cor, color: '#fff', borderRadius: 4, padding: '0 6px', fontSize: 13 }}>{cat.nome}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => removerLancamento(l.id)} className="remover" title="Remover lançamento">Remover</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
      {aba === 'metas' && (
        <div className="secao">
          <div className="secao-titulo">Metas do mês</div>
          <form onSubmit={editandoMeta ? editarMeta : adicionarMeta} className="formulario">
            <input
              type="number"
              placeholder="Valor da meta"
              value={metaValor}
              onChange={e => setMetaValor(e.target.value)}
            />
            <select value={metaTipo} onChange={e => setMetaTipo(e.target.value as 'receita' | 'despesa')}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <select value={metaCategoriaId ?? ''} onChange={e => setMetaCategoriaId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Todas categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
            <button type="submit">{editandoMeta ? 'Salvar' : 'Adicionar'}</button>
            {editandoMeta && (
              <button type="button" onClick={() => { setEditandoMeta(null); setMetaValor(''); setMetaCategoriaId(null); setMetaTipo('despesa'); }}>Cancelar</button>
            )}
          </form>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {metasDoMes().map(meta => {
              const cat = categorias.find(c => c.id === meta.categoria_id);
              const progresso = progressoMeta(meta);
              const ultrapassou = progresso > 100;
              return (
                <li key={meta.id} style={{ background: ultrapassou ? '#d32f2f' : '#23272f', color: '#fff', borderRadius: 6, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: ultrapassou ? '2px solid #ff5252' : undefined }}>
                  <span>{meta.tipo === 'receita' ? 'Receber' : 'Gastar'} R$ {meta.valor.toFixed(2)} {cat && (<span style={{ background: cat.cor, color: '#fff', borderRadius: 4, padding: '0 6px', fontSize: 13 }}>{cat.nome}</span>)}
                    {ultrapassou && <span style={{ color: '#ffbaba', marginLeft: 10, fontWeight: 'bold' }}>Limite ultrapassado!</span>}
                  </span>
                  <div style={{ flex: 1, minWidth: 120, background: '#444', borderRadius: 4, height: 12, margin: '0 8px', position: 'relative' }}>
                    <div style={{ width: Math.min(progresso, 100) + '%', background: meta.tipo === 'receita' ? '#4caf50' : '#d32f2f', height: '100%', borderRadius: 4, transition: 'width 0.3s' }}></div>
                  </div>
                  <span style={{ minWidth: 40 }}>{progresso.toFixed(0)}%</span>
                  <button style={{ marginLeft: 4 }} onClick={() => { setEditandoMeta(meta); setMetaValor(meta.valor.toString()); setMetaTipo(meta.tipo); setMetaCategoriaId(meta.categoria_id || null); }}>✏️</button>
                  <button style={{ marginLeft: 2 }} onClick={() => removerMeta(meta.id)}>🗑️</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {aba === 'categorias' && (
        <div className="secao">
          <div className="secao-titulo">Categorias</div>
          <form onSubmit={editandoCategoria ? editarCategoria : adicionarCategoria} className="formulario">
            <input
              type="text"
              placeholder="Nome da categoria"
              value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
            />
            <input
              type="color"
              value={corCategoria}
              onChange={e => setCorCategoria(e.target.value)}
              title="Cor da categoria"
            />
            <button type="submit">{editandoCategoria ? 'Salvar' : 'Adicionar'}</button>
            {editandoCategoria && (
              <button type="button" onClick={() => { setEditandoCategoria(null); setNovaCategoria(''); setCorCategoria('#1976d2'); }}>Cancelar</button>
            )}
          </form>
          <ul style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {categorias.map(cat => (
              <li key={cat.id} style={{ background: cat.cor, color: '#fff', borderRadius: 6, padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                {cat.nome}
                <button style={{ marginLeft: 4 }} onClick={() => { setEditandoCategoria(cat); setNovaCategoria(cat.nome); setCorCategoria(cat.cor); }}>✏️</button>
                <button style={{ marginLeft: 2 }} onClick={() => removerCategoria(cat.id)}>🗑️</button>
              </li>
            ))}
          </ul>
        </div>
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
          {/* Gráfico de pizza por categoria (despesas) */}
          <h2>Despesas por Categoria</h2>
          <div className="grafico-pizza">
            <Pie data={{
              labels: categorias.map(c => c.nome),
              datasets: [
                {
                  data: categorias.map(c =>
                    lancamentosFiltrados.filter(l => l.tipo === 'despesa' && l.categoria_id === c.id)
                      .reduce((acc, l) => acc + l.valor, 0)
                  ),
                  backgroundColor: categorias.map(c => c.cor),
                  borderWidth: 1,
                },
              ],
            }} />
          </div>
          {/* Relatório detalhado por categoria */}
          <h2>Totais por Categoria (Despesas)</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', margin: '0 auto', maxWidth: 400 }}>
            {categorias.map(c => {
              const total = lancamentosFiltrados.filter(l => l.tipo === 'despesa' && l.categoria_id === c.id)
                .reduce((acc, l) => acc + l.valor, 0);
              if (total === 0) return null;
              return (
                <li key={c.id} style={{ background: c.cor, color: '#fff', borderRadius: 6, padding: '0.3rem 0.8rem', marginBottom: 2 }}>
                  {c.nome}: R$ {total.toFixed(2)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
