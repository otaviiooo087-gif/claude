import { motion } from 'framer-motion';

export default function QRPanel({ qr, status, demo }) {
  if (demo) {
    return (
      <div className="welcome">
        <div className="welcome-emoji">🎬</div>
        <h2>Modo demo ativo</h2>
        <p>As conversas vão aparecer aqui em instantes…</p>
      </div>
    );
  }

  if (status === 'open') {
    return (
      <div className="welcome">
        <div className="welcome-emoji">💬</div>
        <h2>Conectado!</h2>
        <p>Selecione uma conversa à esquerda para acompanhar.</p>
      </div>
    );
  }

  if (qr) {
    return (
      <div className="welcome">
        <h2>Conecte seu WhatsApp</h2>
        <motion.div
          className="qr-frame"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <img src={qr} alt="QR Code do WhatsApp" />
        </motion.div>
        <ol className="qr-steps">
          <li>
            Abra o <b>WhatsApp</b> no celular
          </li>
          <li>
            Toque em <b>Aparelhos conectados</b>
          </li>
          <li>
            Toque em <b>Conectar aparelho</b> e escaneie
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="welcome">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />
      <h2>Conectando ao WhatsApp…</h2>
      <p>
        Ou clique em <b>Modo demo</b> no topo para ver o dashboard em ação.
      </p>
    </div>
  );
}
