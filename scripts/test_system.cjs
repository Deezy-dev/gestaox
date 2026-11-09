const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passedCount = 0;
let failedCount = 0;

function logTest(name, passed, detail = '') {
  if (passed) {
    passedCount++;
    console.log(`  ✓ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedCount++;
    console.error(`  ✗ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   OSDEL GESTÃO X - SUÍTE COMPLETA DE TESTES DE INTEGRIDADE');
  console.log('================================================================');
  console.log(`Alvo de Teste: ${BASE_URL}\n`);

  let authToken = '';

  // --------------------------------------------------------------------------
  // GRUPO 1: Diagnóstico de Saúde e Headers de Segurança (OWASP)
  // --------------------------------------------------------------------------
  console.log('1. TESTES DE INFRAESTRUTURA & SEGURANÇA OWASP');
  try {
    const res = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/health',
      method: 'GET',
    });

    logTest('Endpoint /api/v1/health retorna status 200', res.statusCode === 200);
    logTest('Status da aplicação reporta "online"', res.json?.status === 'online');
    logTest('Header de Segurança X-Content-Type-Options: nosniff', res.headers['x-content-type-options'] === 'nosniff');
    logTest('Header de Segurança X-Frame-Options: SAMEORIGIN', res.headers['x-frame-options'] === 'SAMEORIGIN');
    logTest('Header de Segurança Referrer-Policy', Boolean(res.headers['referrer-policy']));
  } catch (e) {
    logTest('Conexão ao servidor local', false, e.message);
  }

  // --------------------------------------------------------------------------
  // GRUPO 2: Autenticação & Autorização JWT
  // --------------------------------------------------------------------------
  console.log('\n2. TESTES DE AUTENTICAÇÃO E SESSÃO JWT');
  try {
    // 2.1 Login válido
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'deezy', pin: '1234' });

    logTest('Login do superadmin deezy com PIN retorna 200', loginRes.statusCode === 200);
    logTest('Token JWT emitido na resposta', Boolean(loginRes.json?.access_token || loginRes.json?.token));
    authToken = loginRes.json?.access_token || loginRes.json?.token;

    // 2.2 Verificação de Token Válido
    const verifyRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/auth/verify',
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    logTest('Verificação de token com Bearer retorna 200', verifyRes.statusCode === 200 && verifyRes.json?.success === true);

    // 2.3 Tentativa com Credencial Inválida (espera 401)
    const invalidLoginRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'usuario_inexistente', pin: '999999' });

    logTest('Credenciais inválidas rejeitadas com 401', invalidLoginRes.statusCode === 401 && invalidLoginRes.json?.success === false);

    // 2.4 Tentativa sem Token na rota protegida
    const noTokenRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/auth/verify',
      method: 'GET',
    });
    logTest('Acesso sem token bloqueado com 401', noTokenRes.statusCode === 401);
  } catch (e) {
    logTest('Módulo de Autenticação', false, e.message);
  }

  // --------------------------------------------------------------------------
  // GRUPO 3: Validação de Dados & Tratamento de Erros
  // --------------------------------------------------------------------------
  console.log('\n3. TESTES DE VALIDAÇÃO DE DADOS & ERROS DE ENTRADA');
  try {
    // 3.1 Cliente sem nome ou telefone
    const invalidClientRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/clients',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {});
    logTest('Validação: Cadastro de cliente vazio rejeitado com 400', invalidClientRes.statusCode === 400);
    logTest('Código de erro formatado como VALIDATION_FAILED', invalidClientRes.json?.error?.code === 'VALIDATION_FAILED');

    // 3.2 Pagamento com valor zero ou negativo
    const invalidPaymentRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { amount: -500 });
    logTest('Validação: Pagamento negativo rejeitado com 400', invalidPaymentRes.statusCode === 400);

    // 3.3 Rota inexistente (espera 404 estruturado)
    const notFoundRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/rota-inexistente-teste',
      method: 'GET',
    });
    logTest('Rota inexistente retorna 404 estruturado', notFoundRes.statusCode === 404 && notFoundRes.json?.error?.code === 'ENDPOINT_NOT_FOUND');
  } catch (e) {
    logTest('Validação de Dados', false, e.message);
  }

  // --------------------------------------------------------------------------
  // GRUPO 4: Sincronização em Massa (Snapshot & Batch Sync)
  // --------------------------------------------------------------------------
  console.log('\n4. TESTES DE SINCRONIZAÇÃO EM MASSA (ONLINE-FIRST & BATCH)');
  try {
    // 4.1 Snapshot Completo
    const snapshotRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/sync/full-snapshot',
      method: 'GET',
    });
    logTest('Full snapshot retorna status 200', snapshotRes.statusCode === 200);
    logTest('Snapshot inclui array de clientes', Array.isArray(snapshotRes.json?.clients));
    logTest('Snapshot inclui array de facturas', Array.isArray(snapshotRes.json?.invoices));
    logTest('Snapshot inclui array de pagamentos', Array.isArray(snapshotRes.json?.payments));
    logTest('Snapshot inclui contas financeiras padrão e alias accounts', Array.isArray(snapshotRes.json?.financial_accounts) && Array.isArray(snapshotRes.json?.accounts));
    logTest('Snapshot inclui ordens de serviço (service_orders e orders)', Array.isArray(snapshotRes.json?.service_orders) && Array.isArray(snapshotRes.json?.orders));
    logTest('Snapshot inclui canais de TV (tv_channels e tvChannels)', Array.isArray(snapshotRes.json?.tv_channels) && Array.isArray(snapshotRes.json?.tvChannels));
    logTest('Snapshot inclui sumário de contagens (counts)', typeof snapshotRes.json?.counts === 'object' && snapshotRes.json?.counts !== null);
    logTest('Snapshot contém identificador de versão do servidor', Boolean(snapshotRes.json?.version));

    // 4.2 Endpoint de Status e Batimento Ultraleve (/api/v1/sync/status)
    const initialVersion = snapshotRes.json?.version || '';
    const statusRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/v1/sync/status?version=${encodeURIComponent(initialVersion)}&user=deezy`,
      method: 'GET',
    });
    logTest('Endpoint /api/v1/sync/status retorna status 200', statusRes.statusCode === 200);
    logTest('Status reporta "online" com timestamp e has_changes: false', statusRes.json?.status === 'online' && statusRes.json?.has_changes === false);

    // 4.3 Batch Sync Mutation Multi-Módulo (Clientes, Contratos, Ordens, Despesas)
    const batchRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/sync/batch',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      items: [
        {
          module: 'clientes',
          action: 'create',
          entity: 'Cliente',
          payload: {
            code: 'CLI-QA-999',
            fullName: 'Cliente de Teste Automatizado QA',
            phone: '923999888',
            serviceType: 'tv',
            monthlyPrice: 4000,
            dueDay: 5,
          },
        },
        {
          module: 'contratos',
          action: 'create',
          entity: 'Contrato',
          payload: {
            code: 'CT-QA-999',
            clientName: 'Cliente de Teste Automatizado QA',
            planName: 'TV Comunitária',
            monthlyPrice: 4000,
            contractFee: 15000,
            accountId: 'acc-contratos',
          },
        },
        {
          module: 'ordens',
          action: 'create',
          entity: 'Ordem',
          payload: {
            code: 'OS-QA-999',
            clientName: 'Cliente de Teste Automatizado QA',
            serviceType: 'tv',
            type: 'instalacao',
            status: 'aberta',
            priority: 'alta',
            description: 'Instalação teste QA',
          },
        },
        {
          module: 'despesas',
          action: 'create',
          entity: 'Despesa',
          payload: {
            amount: 5000,
            category: 'operacional',
            reason: 'Compra de conectores teste',
            account: 'Caixa Geral',
          },
        },
      ],
    });
    logTest('Batch sync aceita lote multi-módulo e retorna 200', batchRes.statusCode === 200);
    logTest('Mutação multi-módulo sincronizada com 4 sucessos e 0 falhas', batchRes.json?.synced_count === 4 && batchRes.json?.failed_count === 0);

    // 4.4 Verificação de Mudança de Versão após Batch
    const afterBatchStatusRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/v1/sync/status?version=${encodeURIComponent(initialVersion)}&user=deezy`,
      method: 'GET',
    });
    logTest('Servidor notifica has_changes: true para versão defasada do cliente', afterBatchStatusRes.json?.has_changes === true);

  } catch (e) {
    logTest('Sincronização em Massa', false, e.message);
  }

  // --------------------------------------------------------------------------
  // GRUPO 5: Testes de Performance & Latência (Benchmark)
  // --------------------------------------------------------------------------
  console.log('\n5. TESTES DE PERFORMANCE & LATÊNCIA');
  try {
    const latencies = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      await request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/v1/health',
        method: 'GET',
      });
      latencies.push(Date.now() - t0);
    }
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    logTest('Latência média do servidor < 50ms', avgLatency < 50, `${avgLatency}ms médio`);
  } catch (e) {
    logTest('Benchmark de Performance', false, e.message);
  }

  // --------------------------------------------------------------------------
  // Resumo Final
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${passedCount + failedCount} | PASSARAM: ${passedCount} | FALHARAM: ${failedCount}`);
  const rate = Math.round((passedCount / (passedCount + failedCount)) * 100);
  console.log(`TAXA DE SUCESSO: ${rate}%`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Erro fatal ao executar suíte de testes:', err);
  process.exit(1);
});
