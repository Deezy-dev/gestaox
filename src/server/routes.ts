import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  checkDatabaseConnection,
  getFullSnapshot,
  processBatchSync,
  isSupabaseConfigured,
  supabase,
  translateSupabaseError,
  fallbackStore,
  getUsersServer,
  saveUserServer,
  deleteUserServer,
  clearTvChannelsServer,
  cleanDatabaseForProductionServer,
} from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'osdel-gestao-x-master-jwt-secret-2026';
export const router = Router();

// ============================================================================
// HELPER PADRÃO DE RESPOSTA DE ERRO
// ============================================================================

function sendError(
  res: Response,
  statusCode: number,
  message: string,
  errorCode = 'API_ERROR',
  details: any = null
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// DIAGNÓSTICO & HEALTH CHECK DETALHADO
// ============================================================================

async function handleHealthCheck(_req: Request, res: Response) {
  const start = performance.now();
  const dbStatus = await checkDatabaseConnection();
  const memory = process.memoryUsage();

  res.json({
    status: dbStatus.ok ? 'online' : 'degraded',
    version: '3.0.0 (Vite + Node Serverless)',
    server: 'Vercel / Node.js TypeScript',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    latencyMs: Math.round(performance.now() - start),
    memory: {
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
    },
    database: dbStatus,
  });
}

router.get('/health', handleHealthCheck);
router.get('/v1/health', handleHealthCheck);

// ============================================================================
// AUTENTICAÇÃO COM VALIDAÇÃO E GESTÃO DE ERROS
// ============================================================================

router.post(['/v1/auth/login', '/auth/login'], async (req: Request, res: Response) => {
  try {
    const { username, password, pin } = req.body || {};
    const userIdentifier = String(username || '').trim().toLowerCase();

    if (!userIdentifier && !pin) {
      return sendError(res, 400, 'Nome de utilizador ou PIN são obrigatórios.', 'MISSING_CREDENTIALS');
    }

    // 1. Superadmin / Master rápido (deezy)
    if (
      (userIdentifier === 'deezy' || userIdentifier === 'admin') &&
      (pin === '1234' || pin === '9999' || password === 'admin123' || password === '1234' || password === '52863400#' || !password)
    ) {
      const payload = {
        id: 1,
        username: 'deezy',
        full_name: 'Deezy Gestor Master',
        role: 'superadmin',
        job_title: 'Director Geral',
        department: 'Direcção Geral',
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        success: true,
        access_token: token,
        token,
        user: payload,
      });
    }

    // 2. Consulta no Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', userIdentifier)
          .eq('is_active', true)
          .maybeSingle();

        if (userError) {
          console.warn('[Supabase Auth Warning]:', translateSupabaseError(userError));
        }

        if (user && (String(user.pin) === String(pin) || user.password_hash === password || user.password === password || (!password && String(user.pin) === String(pin)))) {
          const payload = {
            id: user.id,
            username: user.username,
            full_name: user.full_name || user.name || user.username,
            name: user.full_name || user.name || user.username,
            role: user.role || 'operador',
            job_title: user.job_title || 'Colaborador',
            department: user.department || 'Operações',
            phone: user.phone || '',
          };
          const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
          return res.json({
            success: true,
            access_token: token,
            token,
            user: payload,
          });
        }
      } catch (dbErr: any) {
        console.error('[Supabase Auth Exception]:', dbErr?.message);
      }
    }

    // 2.1 Consulta no fallbackStore.users em tempo real (colaboradores criados em casa ou sem Supabase)
    const memoryUser = fallbackStore.users.find(
      (u: any) => String(u.username || '').toLowerCase() === userIdentifier && u.is_active !== false
    );
    if (
      memoryUser &&
      (String(memoryUser.pin) === String(pin) ||
        memoryUser.password === password ||
        memoryUser.password_hash === password ||
        (!password && String(memoryUser.pin) === String(pin)) ||
        pin === '1234')
    ) {
      const payload = {
        id: memoryUser.id || Date.now(),
        username: memoryUser.username,
        full_name: memoryUser.full_name || memoryUser.name || memoryUser.username,
        name: memoryUser.full_name || memoryUser.name || memoryUser.username,
        role: memoryUser.role || 'operador',
        job_title: memoryUser.job_title || memoryUser.jobTitle || 'Colaborador',
        department: memoryUser.department || 'Operações',
        phone: memoryUser.phone || '',
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        success: true,
        access_token: token,
        token,
        user: payload,
      });
    }

    // 3. Validação de contingência por PIN padrão (1234) para operador genérico se o nome for preenchido
    if (pin === '1234' && userIdentifier) {
      const payload = {
        id: 99,
        username: userIdentifier,
        full_name: userIdentifier.toUpperCase(),
        name: userIdentifier.toUpperCase(),
        role: 'operador',
        job_title: 'Operador de Atendimento',
        department: 'Atendimento',
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        success: true,
        access_token: token,
        token,
        user: payload,
      });
    }

    return sendError(res, 401, 'Credenciais inválidas. Verifique o utilizador e a palavra-passe ou PIN.', 'INVALID_CREDENTIALS');
  } catch (err: any) {
    return sendError(res, 500, 'Falha interna durante a autenticação.', 'AUTH_INTERNAL_ERROR', err?.message);
  }
});

// Login do APK Cliente
router.post(['/v1/auth/client-login', '/auth/client-login'], async (req: Request, res: Response) => {
  try {
    const { code, pin } = req.body || {};
    const cCode = String(code || '').trim().toUpperCase();
    const cPin = String(pin || '').trim();

    if (!cCode) {
      return sendError(res, 400, 'Código do cliente ou número de telefone é obrigatório.', 'MISSING_CLIENT_CODE');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: client, error } = await supabase
          .from('clients')
          .select('*')
          .or(`code.eq.${cCode},phone.eq.${code}`)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('[Supabase Client Login Warning]:', translateSupabaseError(error));
        }

        if (client && (String(client.pin || '1234').trim() === cPin || cPin === '1234')) {
          const token = jwt.sign({ clientId: client.id, code: client.code, type: 'client' }, JWT_SECRET, { expiresIn: '30d' });
          return res.json({
            success: true,
            token,
            client: {
              id: client.id,
              code: client.code,
              fullName: client.full_name,
              phone: client.phone,
              address: client.address,
              serviceType: client.service_type,
              status: client.status,
              monthlyPrice: client.monthly_fee,
              dueDay: client.due_day,
            },
          });
        }
      } catch (err: any) {
        console.error('[Supabase Client Login Exception]:', err?.message);
      }
    }

    // Fallback permissivo para demonstração e clientes com PIN padrão
    if (cCode && (cPin === '1234' || !cPin)) {
      const token = jwt.sign({ clientId: 1, code: cCode, type: 'client' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        success: true,
        token,
        client: {
          id: 1,
          code: cCode,
          fullName: 'Assinante OSDEL',
          phone: '926153736',
          serviceType: 'tv',
          status: 'active',
          monthlyPrice: 4000,
          dueDay: 5,
        },
      });
    }

    return sendError(res, 401, 'Código de cliente ou PIN inválido.', 'INVALID_CLIENT_CREDENTIALS');
  } catch (err: any) {
    return sendError(res, 500, 'Falha interna ao autenticar cliente.', 'CLIENT_AUTH_ERROR', err?.message);
  }
});

router.get(['/v1/auth/verify', '/auth/verify'], (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return sendError(res, 401, 'Cabeçalho de autorização (Bearer token) ausente.', 'UNAUTHORIZED');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: decoded });
  } catch (err: any) {
    return sendError(res, 401, 'Token de sessão expirado ou inválido.', 'INVALID_TOKEN', err?.message);
  }
});

// ============================================================================
// SINCRONIZAÇÃO EM MASSA (SNAPSHOT & BATCH)
// ============================================================================

let currentServerVersion = `${Date.now()}`;

export function bumpServerVersion() {
  currentServerVersion = `${Date.now()}`;
}

router.get(['/v1/sync/status', '/sync/status'], async (req: Request, res: Response) => {
  try {
    const clientVersion = String(req.query.version || '');
    const clientUsername = String(req.query.user || '').toLowerCase();
    
    let sessionRevoked = false;
    if (clientUsername && clientUsername !== 'deezy' && clientUsername !== 'admin') {
      const snapshot = await getFullSnapshot();
      const user = (snapshot.users || []).find((u: any) => String(u.username || '').toLowerCase() === clientUsername);
      if (!user || user.is_active === false) {
        sessionRevoked = true;
      }
    }

    const hasChanges = Boolean(clientVersion && clientVersion !== currentServerVersion);

    return res.json({
      status: 'online',
      version: currentServerVersion,
      has_changes: hasChanges,
      session_revoked: sessionRevoked,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return sendError(res, 500, 'Erro ao verificar estado de sincronização.', 'SYNC_STATUS_ERROR', err?.message);
  }
});

router.get(['/v1/sync/full-snapshot', '/sync/full-snapshot'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json({
      ...snapshot,
      version: currentServerVersion,
    });
  } catch (err: any) {
    return sendError(res, 500, 'Erro ao gerar snapshot de dados da nuvem.', 'SNAPSHOT_ERROR', err?.message);
  }
});

router.post(['/v1/sync/batch', '/sync/batch'], async (req: Request, res: Response) => {
  try {
    const items = req.body?.items || req.body?.mutations || (Array.isArray(req.body) ? req.body : []);
    if (!Array.isArray(items)) {
      return sendError(res, 400, 'Formato inválido. O corpo da requisição deve conter um array "items".', 'INVALID_BATCH_FORMAT');
    }
    const result = await processBatchSync(items);
    if (result.synced_count > 0) {
      bumpServerVersion();
    }
    return res.json({
      ...result,
      version: currentServerVersion,
    });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao processar lote de sincronização.', 'BATCH_SYNC_ERROR', err?.message);
  }
});

// ============================================================================
// CLIENTES (REST COM VALIDAÇÃO DE CAMPOS)
// ============================================================================

router.get(['/v1/clients', '/clients'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json(snapshot.clients || []);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao listar clientes.', 'CLIENTS_FETCH_ERROR', err?.message);
  }
});

router.post(['/v1/clients', '/clients'], async (req: Request, res: Response) => {
  try {
    const clientData = req.body || {};
    const fullName = String(clientData.fullName || clientData.full_name || '').trim();
    const phone = String(clientData.phone || '').trim();

    if (!fullName) {
      return sendError(res, 400, 'O nome completo do cliente é obrigatório.', 'VALIDATION_FAILED', { field: 'fullName' });
    }
    if (!phone) {
      return sendError(res, 400, 'O telefone de contacto é obrigatório.', 'VALIDATION_FAILED', { field: 'phone' });
    }

    await processBatchSync([{
      module: 'clientes',
      action: 'create',
      entity: 'Cliente',
      payload: clientData,
    }]);

    return res.status(201).json({ success: true, client: clientData });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao registar novo cliente.', 'CLIENT_CREATE_ERROR', err?.message);
  }
});

router.put(['/v1/clients/:id', '/clients/:id'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'Identificador de cliente não fornecido.', 'MISSING_CLIENT_ID');
    }

    const clientData = { ...req.body, id };
    await processBatchSync([{
      module: 'clientes',
      action: 'update',
      entity: 'Cliente',
      payload: clientData,
    }]);

    return res.json({ success: true, client: clientData });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao atualizar dados do cliente.', 'CLIENT_UPDATE_ERROR', err?.message);
  }
});

router.delete(['/v1/clients/:id', '/clients/:id'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'Identificador de cliente não fornecido.', 'MISSING_CLIENT_ID');
    }

    await processBatchSync([{
      module: 'clientes',
      action: 'delete',
      entity: 'Cliente',
      payload: { id, uuid: req.body?.uuid, code: req.body?.code },
    }]);

    return res.json({ success: true, message: 'Cliente removido com sucesso (Soft Delete).' });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao remover cliente.', 'CLIENT_DELETE_ERROR', err?.message);
  }
});

// ============================================================================
// PAGAMENTOS & FACTURAS (REST)
// ============================================================================

router.get(['/v1/payments', '/payments'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json(snapshot.payments || []);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao listar pagamentos.', 'PAYMENTS_FETCH_ERROR', err?.message);
  }
});

router.post(['/v1/payments', '/payments'], async (req: Request, res: Response) => {
  try {
    const paymentData = req.body || {};
    const amount = Number(paymentData.amount || paymentData.total || 0);

    if (amount <= 0) {
      return sendError(res, 400, 'O valor do pagamento deve ser superior a zero.', 'INVALID_PAYMENT_AMOUNT');
    }

    await processBatchSync([{
      module: 'pagamentos',
      action: 'create',
      entity: 'Pagamento',
      payload: paymentData,
    }]);

    return res.status(201).json({ success: true, payment: paymentData });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao processar pagamento.', 'PAYMENT_PROCESS_ERROR', err?.message);
  }
});

router.get(['/v1/invoices', '/invoices'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json(snapshot.invoices || []);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao listar faturas.', 'INVOICES_FETCH_ERROR', err?.message);
  }
});

router.post(['/v1/invoices', '/invoices'], async (req: Request, res: Response) => {
  try {
    const invData = req.body || {};
    await processBatchSync([{
      module: 'fecho',
      action: 'create',
      entity: 'Factura',
      payload: invData,
    }]);
    return res.status(201).json({ success: true, invoice: invData });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao emitir fatura.', 'INVOICE_CREATE_ERROR', err?.message);
  }
});

// ============================================================================
// CONTAS FINANCEIRAS & DEFINIÇÕES
// ============================================================================

router.get(['/v1/financial-accounts', '/financial-accounts'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json(snapshot.financial_accounts || []);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao consultar contas financeiras.', 'ACCOUNTS_FETCH_ERROR', err?.message);
  }
});

router.get(['/v1/expenses', '/expenses'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json(snapshot.expenses || []);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao consultar despesas.', 'EXPENSES_FETCH_ERROR', err?.message);
  }
});

router.post(['/v1/expenses', '/expenses'], async (req: Request, res: Response) => {
  try {
    const expenseData = req.body || {};
    const amount = Number(expenseData.amount || 0);

    if (amount <= 0) {
      return sendError(res, 400, 'O valor da despesa deve ser superior a zero.', 'INVALID_EXPENSE_AMOUNT');
    }

    await processBatchSync([{
      module: 'despesas',
      action: 'create',
      entity: 'Despesa',
      payload: expenseData,
    }]);

    return res.status(201).json({ success: true, expense: expenseData });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao registar despesa.', 'EXPENSE_CREATE_ERROR', err?.message);
  }
});

router.get(['/v1/settings', '/settings'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json(snapshot.settings || {});
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao carregar definições.', 'SETTINGS_FETCH_ERROR', err?.message);
  }
});

// ============================================================================
// COLABORADORES & EQUIPA (SINCRONIZAÇÃO EM TEMPO REAL ENTRE CASA E EMPRESA)
// ============================================================================

router.get(['/v1/users', '/users'], async (_req: Request, res: Response) => {
  try {
    const list = await getUsersServer();
    return res.json(list);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao listar colaboradores.', 'USERS_FETCH_ERROR', err?.message);
  }
});

router.post(['/v1/users', '/users'], async (req: Request, res: Response) => {
  try {
    const userData = req.body || {};
    const username = String(userData.username || userData.name || '').trim().toLowerCase();
    if (!username) {
      return sendError(res, 400, 'Nome de utilizador ou nome do colaborador é obrigatório.', 'VALIDATION_FAILED', { field: 'username' });
    }
    const saved = await saveUserServer(userData);
    return res.status(201).json({ success: true, user: saved });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao guardar colaborador.', 'USER_SAVE_ERROR', err?.message);
  }
});

router.delete(['/v1/users/:id', '/users/:id'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'ID ou username do colaborador é obrigatório.', 'VALIDATION_FAILED');
    }
    await deleteUserServer(id);
    return res.json({ success: true, message: `Colaborador ${id} eliminado/revogado com sucesso.` });
  } catch (err: any) {
    return sendError(res, 400, err?.message || 'Falha ao eliminar colaborador.', 'USER_DELETE_ERROR');
  }
});

// ============================================================================
// CANAIS TV & CABO (GESTÃO MANUAL EM PRODUÇÃO)
// ============================================================================

router.get(['/v1/tv-channels', '/tv-channels'], async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFullSnapshot();
    return res.json({ items: snapshot.tv_channels || snapshot.tvChannels || [] });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao listar canais.', 'CHANNELS_FETCH_ERROR', err?.message);
  }
});

router.delete(['/v1/tv-channels', '/tv-channels'], async (_req: Request, res: Response) => {
  try {
    await clearTvChannelsServer();
    return res.json({ success: true, message: 'Grelha de canais limpa com sucesso para gravação manual em produção.' });
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao limpar grelha de canais.', 'CHANNELS_CLEAR_ERROR', err?.message);
  }
});

// ============================================================================
// LIMPEZA TOTAL PARA PRODUÇÃO (0 CLIENTES, 0 FATURAS DE TESTE, SÓ DEEZY)
// ============================================================================

router.post(['/v1/system/clean-production', '/system/clean-production'], async (_req: Request, res: Response) => {
  try {
    const result = await cleanDatabaseForProductionServer();
    return res.json(result);
  } catch (err: any) {
    return sendError(res, 500, 'Falha ao preparar sistema para produção.', 'CLEAN_PRODUCTION_ERROR', err?.message);
  }
});

// ============================================================================
// ROTA NÃO ENCONTRADA (404) DENTRO DA API
// ============================================================================

router.use('*', (req: Request, res: Response) => {
  sendError(res, 404, `Endpoint da API não encontrado: ${req.method} ${req.baseUrl}${req.path}`, 'ENDPOINT_NOT_FOUND');
});
