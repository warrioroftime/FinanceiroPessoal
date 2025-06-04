import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Você pode logar o erro em um serviço externo aqui
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#fff', background: '#23272f', minHeight: '100vh', textAlign: 'center' }}>
          <h1>Ocorreu um erro inesperado 😢</h1>
          <p>Desculpe, algo deu errado ao exibir a aplicação.</p>
          <pre style={{ color: '#ff5252', background: '#1a1a1a', padding: 16, borderRadius: 8, margin: '24px auto', maxWidth: 600, overflowX: 'auto' }}>{String(this.state.error)}</pre>
          <button onClick={() => window.location.reload()}>Recarregar página</button>
        </div>
      );
    }
    return this.props.children;
  }
}
