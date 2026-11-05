const test = require('node:test');
const assert = require('node:assert');
const { criarApp, cpfValido } = require('./server');

async function subir() {
  const { server } = criarApp({ arquivoDb: ':memory:' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const cliente = () => {
    let cookie = '';
    return async (m, url, body) => {
      const r = await fetch(base + url, { method: m, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
      return { status: r.status, json: await r.json().catch(() => ({})) };
    };
  };
  return { server, cliente };
}

test('cpf', () => {
  assert.ok(cpfValido('529.982.247-25'));
  assert.ok(!cpfValido('111.111.111-11'));
  assert.ok(!cpfValido('123'));
});

test('fluxo completo e isolamento entre empresas', async () => {
  const { server, cliente } = await subir();
  try {
    const a = cliente(), b = cliente();
    assert.equal((await a('GET', '/api/clientes')).status, 401);
    assert.equal((await a('POST', '/api/registrar', { empresa: 'A', nome: 'Ana', email: 'a@a.com', senha: 'curta' })).status, 400);
    assert.equal((await a('POST', '/api/registrar', { empresa: 'A', nome: 'Ana', email: 'a@a.com', senha: 'senhaforte1' })).status, 201);
    assert.equal((await b('POST', '/api/registrar', { empresa: 'B', nome: 'Beto', email: 'b@b.com', senha: 'senhaforte2' })).status, 201);
    assert.equal((await a('POST', '/api/registrar', { empresa: 'X', nome: 'X', email: 'a@a.com', senha: 'senhaforte1' })).status, 409);

    assert.equal((await a('POST', '/api/clientes', { nome: 'Zé', cpf: '123' })).status, 400);
    const c = (await a('POST', '/api/clientes', { nome: 'Zé', cpf: '52998224725', valor_servico: 300 })).json;
    assert.equal(c.etapa, 'lead');

    // empresa B não enxerga nem mexe nos dados da A
    assert.equal((await b('GET', `/api/clientes/${c.id}`)).status, 404);
    assert.equal((await b('PATCH', `/api/clientes/${c.id}`, { etapa: 'limpo' })).status, 404);
    assert.equal((await b('POST', `/api/clientes/${c.id}/dividas`, { credor: 'X', valor: 1 })).status, 404);
    assert.equal((await b('GET', '/api/clientes')).json.length, 0);

    assert.equal((await a('PATCH', `/api/clientes/${c.id}`, { etapa: 'inexistente' })).status, 400);
    assert.equal((await a('PATCH', `/api/clientes/${c.id}`, { etapa: 'contrato' })).json.etapa, 'contrato');
    assert.equal((await a('POST', `/api/clientes/${c.id}/dividas`, { credor: 'Banco', valor: 1500.5 })).status, 201);

    // parcelamento: soma bate no centavo e dia 31 não pula mês
    assert.equal((await a('POST', `/api/clientes/${c.id}/parcelas`, { total: 100, quantidade: 3, primeiro_vencimento: '2024-01-31' })).status, 201);
    const f = (await a('GET', `/api/clientes/${c.id}`)).json;
    assert.deepEqual(f.parcelas.map((p) => p.vencimento), ['2024-01-31', '2024-02-29', '2024-03-31']);
    assert.equal(Math.round(f.parcelas.reduce((s, p) => s + p.valor, 0) * 100), 10000);

    await a('PATCH', `/api/parcelas/${f.parcelas[0].id}`, { pago: true });
    const d = (await a('GET', '/api/dashboard')).json;
    assert.equal(d.clientes, 1);
    assert.ok(d.recebido > 33 && d.recebido < 34);
    assert.equal(d.em_atraso.n, 2); // as 2 parcelas não pagas já venceram (datas fixas no passado)
    assert.equal((await b('GET', '/api/dashboard')).json.clientes, 0);

    assert.equal((await a('POST', '/api/logout')).status, 200);
    assert.equal((await a('GET', '/api/me')).status, 401);
    assert.equal((await a('POST', '/api/login', { email: 'a@a.com', senha: 'errada123' })).status, 401);
    assert.equal((await a('POST', '/api/login', { email: 'a@a.com', senha: 'senhaforte1' })).status, 200);
  } finally { server.close(); }
});
