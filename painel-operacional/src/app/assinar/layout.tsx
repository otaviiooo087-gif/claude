import type { Viewport } from 'next';

// O cliente precisa poder dar zoom para ler o contrato no celular (o resto do app trava o zoom).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AssinarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
