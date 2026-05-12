'use strict';

const AUTH_TTL     = 30 * 60 * 1000; // autenticação válida por 30 min
const FLOW_TTL     = 10 * 60 * 1000; // fluxo expira após 10 min sem atividade
const LOCKOUT_TTL  =  5 * 60 * 1000; // bloqueio por 5 min após 3 erros
const MAX_ATTEMPTS = 3;

// Estrutura por jid: { authedAt, state, phone, lockedAt, attempts, flowAt }
const _store = new Map();

function _get(jid) { return _store.get(jid) || {}; }
function _set(jid, data) { _store.set(jid, data); }

function isAuthenticated(jid) {
  const d = _get(jid);
  return !!(d.authedAt && Date.now() - d.authedAt < AUTH_TTL);
}

function isLockedOut(jid) {
  const d = _get(jid);
  return !!(d.lockedAt && Date.now() - d.lockedAt < LOCKOUT_TTL);
}

// Retorna o número de tentativas erradas ou 'LOCKED' se bloqueou agora
function recordWrongPassword(jid) {
  const d = _get(jid);
  const attempts = (d.attempts || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    _set(jid, { ...d, attempts: 0, lockedAt: Date.now(), state: null });
    return 'LOCKED';
  }
  _set(jid, { ...d, attempts });
  return attempts;
}

function authenticate(jid) {
  const d = _get(jid);
  _set(jid, {
    ...d,
    authedAt: Date.now(),
    attempts: 0,
    lockedAt: null,
    state: 'WAITING_PHONE',
    flowAt: Date.now(),
    phone: null,
  });
}

// Retorna o estado atual do fluxo ou null se expirou/não iniciado
function getFlowState(jid) {
  const d = _get(jid);
  if (!d.state) return null;
  if (d.flowAt && Date.now() - d.flowAt > FLOW_TTL) {
    _set(jid, { ...d, state: null, phone: null, flowAt: null });
    return null;
  }
  return d.state;
}

function setFlowState(jid, state, extra = {}) {
  const d = _get(jid);
  _set(jid, { ...d, ...extra, state, flowAt: Date.now() });
}

function getPhone(jid) { return _get(jid).phone || null; }

function resetFlow(jid) {
  const d = _get(jid);
  _set(jid, { ...d, state: null, phone: null, flowAt: null });
}

module.exports = {
  isAuthenticated,
  isLockedOut,
  recordWrongPassword,
  authenticate,
  getFlowState,
  setFlowState,
  getPhone,
  resetFlow,
  MAX_ATTEMPTS,
};
