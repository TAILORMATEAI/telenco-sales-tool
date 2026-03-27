import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* @ts-ignore - Vite handled environment variable */}
    <BrowserRouter basename={import.meta.env.PROD ? "/telenco-sales-tool" : "/"}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
