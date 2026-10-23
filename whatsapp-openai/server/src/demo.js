// Modo demo: injeta conversas e mensagens falsas no mesmo pipeline do WhatsApp,
// para gravar o vídeo sem precisar conectar um número real.
// Se houver OPENAI_API_KEY, as respostas são geradas de verdade pela IA.

const CONTACTS = [
  { id: 'demo-ana@s.whatsapp.net', name: 'Ana Beatriz' },
  { id: 'demo-carlos@s.whatsapp.net', name: 'Carlos Mendes' },
  { id: 'demo-juliana@s.whatsapp.net', name: 'Juliana Souza' },
  { id: 'demo-pedro@s.whatsapp.net', name: 'Pedro Henrique' },
  { id: 'demo-marina@s.whatsapp.net', name: 'Marina Lopes' },
  { id: 'demo-rafael@s.whatsapp.net', name: 'Rafael Castro' },
];

const OPENERS = [
  'Oi, tudo bem? 😊',
  'Bom dia! Vocês estão abertos hoje?',
  'Olá! Queria saber mais sobre os serviços de vocês',
  'Oi! Vi o anúncio e fiquei interessado',
  'E aí, como funciona o atendimento de vocês?',
  'Boa tarde! Vocês fazem entrega?',
  'Oi, consegue me ajudar com uma dúvida rápida?',
  'Olá! Qual é o horário de funcionamento?',
  'Quanto custa pra fazer um orçamento?',
  'Oi! Ainda tem disponibilidade pra essa semana?',
];

const FOLLOWUPS = [
  'Entendi! E vocês aceitam cartão?',
  'Perfeito, muito obrigado! 🙏',
  'Legal! Pode me mandar mais detalhes?',
  'Hmm, e tem alguma promoção rolando?',
  'Show! Vou pensar e te aviso 👍',
  'E quanto tempo costuma demorar?',
  'Ótimo, era isso que eu queria saber 😄',
  'Vocês ficam em qual endereço?',
  'Dá pra agendar pra amanhã?',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createDemo({ handleInbound }) {
  let timer = null;
  let running = false;
  let tick = 0;

  async function step() {
    const contact = pick(CONTACTS);
    // Primeiras mensagens abrem novas conversas; depois, mistura follow-ups.
    const text =
      tick < CONTACTS.length
        ? pick(OPENERS)
        : pick(Math.random() < 0.55 ? FOLLOWUPS : OPENERS);
    tick++;
    await handleInbound({ conversationId: contact.id, name: contact.name, text, isDemo: true });
  }

  function scheduleNext() {
    const wait = 3500 + Math.random() * 4000; // 3.5s – 7.5s
    timer = setTimeout(async () => {
      if (!running) return;
      await step();
      if (running) scheduleNext();
    }, wait);
  }

  return {
    isRunning: () => running,
    start() {
      if (running) return;
      running = true;
      tick = 0;
      step().finally(() => {
        if (running) scheduleNext();
      });
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
