'use strict';

require('dotenv').config();
const { startBot } = require('./bot');

console.log('🚀 Iniciando bot de artes WhatsApp...');
console.log('   Templates disponíveis: Limpa Nome, Score, Parcelas, Rating Bancário\n');

startBot().catch((err) => {
  console.error('Erro fatal ao iniciar o bot:', err);
  process.exit(1);
});
