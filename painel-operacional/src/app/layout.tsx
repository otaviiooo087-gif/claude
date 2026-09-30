import type { Metadata, Viewport } from 'next';
import PwaRegister from '@/components/PwaRegister';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/useAuth';
import AuthGate from '@/components/AuthGate';
import EmergenciaWatcher from '@/components/EmergenciaWatcher';
import AutomacaoContratos from '@/components/AutomacaoContratos';
import './globals.css';

const BASE = process.env.GITHUB_PAGES === 'true' ? '/claude' : '';

export const metadata: Metadata = {
  title: 'Zimba Festas App',
  description: 'Painel offline para controle de montagens e retiradas.',
  manifest: `${BASE}/manifest.json`,
  icons: {
    icon: [{ url: `${BASE}/icons/icon-192.png?v=3`, type: 'image/png' }],
    apple: `${BASE}/icons/icon-192.png?v=3`,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1568bb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-900 text-slate-50 antialiased">
        <PwaRegister />
        <ErrorBoundary>
          <AuthProvider>
            <EmergenciaWatcher />
            <AutomacaoContratos />
            <AuthGate>{children}</AuthGate>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
