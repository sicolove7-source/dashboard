import React from 'react';
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      const message = this.props.message || 'حدث خطأ غير متوقع أثناء عرض هذه الواجهة.';

      return (
        <div
          dir="rtl"
          style={{
            margin: '20px auto',
            maxWidth: 680,
            padding: '24px 28px',
            borderRadius: 16,
            background: 'var(--card, #ffffff)',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.08)',
            textAlign: 'right',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={24} color="#EF4444" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink, #1e293b)' }}>
                {this.props.title || 'تعذر تحميل هذه البيانات مؤقتاً'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted, #64748b)' }}>
                {message}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={15} />
              <span>إعادة المحاولة</span>
            </button>

            {this.props.onBack && (
              <button
                type="button"
                onClick={this.props.onBack}
                className="btn btn-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                <span>العودة للقائمة</span>
              </button>
            )}

            {this.state.error && (
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted, #64748b)',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginRight: 'auto'
                }}
              >
                <span>تفاصيل الخطأ</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          {this.state.showDetails && this.state.error && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.05)',
                fontSize: 12,
                fontFamily: 'monospace',
                direction: 'ltr',
                textAlign: 'left',
                overflowX: 'auto',
                color: '#dc2626'
              }}
            >
              <strong>{this.state.error.name}:</strong> {this.state.error.message}
              {this.state.error.stack && (
                <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 11, color: '#64748b' }}>
                  {this.state.error.stack.slice(0, 500)}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
