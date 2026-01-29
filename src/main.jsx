import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#dc2626', fontFamily: 'monospace', background: '#fef2f2', height: '100vh', overflow: 'auto' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Something went wrong</h2>
          <div style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #fee2e2' }}>
            <strong>{this.state.error && this.state.error.toString()}</strong>
          </div>
          <details style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.5' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Stack Trace</summary>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
