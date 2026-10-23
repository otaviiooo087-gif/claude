const MAP = {
  connecting: { c: 'amber', t: 'Conectando…' },
  qr: { c: 'blue', t: 'Escaneie o QR' },
  open: { c: 'green', t: 'Online' },
  close: { c: 'red', t: 'Reconectando…' },
  logged_out: { c: 'red', t: 'Desconectado' },
  error: { c: 'red', t: 'Erro' },
  idle: { c: 'gray', t: 'WhatsApp off' },
  demo: { c: 'purple', t: 'Modo demo' },
};

export default function ConnectionBadge({ status }) {
  const s = MAP[status] || MAP.idle;
  return (
    <div className={`badge badge-${s.c}`}>
      <span className="badge-dot" />
      {s.t}
    </div>
  );
}
