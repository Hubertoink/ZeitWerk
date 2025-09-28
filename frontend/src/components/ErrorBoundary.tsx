import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Etwas ist schiefgelaufen
            </Typography>
            <Typography variant="body2" gutterBottom>
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Typography variant="caption" component="pre" sx={{ 
                mt: 2, 
                textAlign: 'left', 
                overflow: 'auto', 
                maxHeight: 200,
                backgroundColor: 'grey.100',
                p: 1,
                borderRadius: 1
              }}>
                {this.state.errorInfo.componentStack}
              </Typography>
            )}
          </Alert>
          <Button variant="contained" onClick={this.handleReset}>
            Erneut versuchen
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()} 
            sx={{ ml: 2 }}
          >
            Seite neu laden
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
