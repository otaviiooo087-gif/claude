export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDateLabel(iso: string): string {
  const today = todayISO();
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
  const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  if (iso === today) return `Hoje, ${label}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === tomorrow.toISOString().slice(0, 10)) return `Amanhã, ${label}`;
  return `${weekday}, ${label}`;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}

export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}
