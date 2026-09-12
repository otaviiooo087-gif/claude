import type { Metadata, Viewport } from 'next';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Painel Operacional',
  description: 'Ferramenta pessoal de operação para montagem e retirada de infláveis',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
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
        {children}
      </body>
    </html>
  );
}
