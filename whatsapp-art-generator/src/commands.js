'use strict';

const { SERVICE_ALIASES, TEMPLATES } = require('./templates');

function parseArtCommand(text) {
  const lower = text.toLowerCase().trim();
  if (!lower.startsWith('!arte ')) return null;

  const content = lower.slice(6).trim();

  // Phone number: last token that contains mostly digits (8-13 digits total)
  const phoneMatch = content.match(/(\(?\d{1,3}\)?\s*[\d\s\-]{7,14}\d)\s*$/);
  if (!phoneMatch) return null;

  const phone = phoneMatch[1].replace(/\D/g, '');
  if (phone.length < 8 || phone.length > 15) return null;

  const serviceRaw = content
    .slice(0, content.lastIndexOf(phoneMatch[0]))
    .trim()
    .replace(/-/g, ' ');

  for (const [key, aliases] of Object.entries(SERVICE_ALIASES)) {
    for (const alias of aliases) {
      if (serviceRaw === alias || serviceRaw.includes(alias)) {
        return { templateKey: key, phone };
      }
    }
  }

  return null;
}

const HELP_TEXT = `*🎨 Bot de Artes — Comandos disponíveis*

*!arte limpa nome [número]*
_Ex: !arte limpa nome 11999999999_

*!arte score [número]*
_Ex: !arte score 21988887777_

*!arte parcelas [número]*
_Ex: !arte parcelas 31977776666_

*!arte rating [número]*
_Ex: !arte rating 85966665555_

O número deve conter o DDD (com ou sem código do país).

*!ajuda* — exibe esta mensagem novamente`;

module.exports = { parseArtCommand, HELP_TEXT };
