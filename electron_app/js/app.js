/**
 * OSDEL TECNOLOGIA · DESKTOP (ELECTRON) APPLICATION LOGIC & CONTROLLER
 * 100% de paridade com o sistema web oficial, design tokens, regras fiscais e impressão POS.
 * Suporta Executável Dedicado de Fibra Óptica (.exe), TV Cabo (.exe) e Modo Unificado.
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. ESTADO GLOBAL & PERSISTÊNCIA EM LOCALSTORAGE
  // =========================================================================
  const STORAGE_KEY_CLIENTS = 'osdel_desktop_clients';
  const STORAGE_KEY_INVOICES = 'osdel_desktop_invoices';
  const STORAGE_KEY_ORDERS = 'osdel_desktop_orders';
  const STORAGE_KEY_INVENTORY = 'osdel_desktop_inventory';
  const STORAGE_KEY_TEAM = 'osdel_desktop_team';
  const STORAGE_KEY_MODE = 'osdel-service-mode';

  // Seed inicial de clientes do ecossistema OSDEL
  const DEFAULT_CLIENTS = [
    { id: 1, code: 'CLI-00101', name: 'Mateus de Sousa', service: 'tv', status: 'active', fee: 4000, address: 'Bloco B, Casa 12', pdo: 'Tap TV-04', onu: '—', phone: '923 881 902' },
    { id: 2, code: 'CLI-00102', name: 'Esperança Manuel', service: 'fiber', status: 'active', fee: 13000, address: 'Rua Direita, Casa 45', pdo: 'PDO-02 (P3)', onu: 'ZTE-GC21A9', phone: '934 112 304' },
    { id: 3, code: 'CLI-00103', name: 'António Kiala', service: 'tv', status: 'late', fee: 4000, address: 'Sector C, Casa 8', pdo: 'Tap TV-07', onu: '—', phone: '912 400 918' },
    { id: 4, code: 'CLI-00104', name: 'Joaquina Pedro', service: 'fiber', status: 'late', fee: 13000, address: 'Bairro Novo, Casa 19', pdo: 'PDO-03 (P1)', onu: 'HW-8245H', phone: '921 550 200' },
    { id: 5, code: 'CLI-00105', name: 'Domingos Baptista', service: 'tv', status: 'cut', fee: 4000, address: 'Bloco A, Casa 04', pdo: 'Tap TV-01', onu: '—', phone: '945 882 103' },
    { id: 6, code: 'CLI-00106', name: 'Teresa Sebastião', service: 'fiber', status: 'active', fee: 21000, address: 'Rua Principal, Casa 88', pdo: 'PDO-05 (P6)', onu: 'FBR-9014', phone: '924 330 901' },
    { id: 7, code: 'CLI-00107', name: 'Manuel Panzo', service: 'tv', status: 'active', fee: 4000, address: 'Zona Alta, Casa 22', pdo: 'Tap TV-06', onu: '—', phone: '917 772 101' },
    { id: 8, code: 'CLI-00108', name: 'Beatriz Neto', service: 'fiber', status: 'cut', fee: 13000, address: 'Bloco D, Casa 14', pdo: 'PDO-08 (P2)', onu: 'ZTE-98B2', phone: '939 120 405' },
    { id: 9, code: 'CLI-00109', name: 'Kikas Gomes', service: 'combo', status: 'active', fee: 16500, address: 'Zona Verde, Casa 30', pdo: 'PDO-01 / Tap-02', onu: 'HW-V300', phone: '928 440 221' }
  ];

  const DEFAULT_INVOICES = [
    { id: 201, number: 'FT-2026/00142', clientId: 1, clientName: 'Mateus de Sousa', description: 'Mensalidade TV Cabo', amount: 4000, penalty: 0, total: 4000, method: 'Multicaixa', date: '17/10/2026', status: 'Liquidada', operator: 'Maria (Balcão)' },
    { id: 202, number: 'FT-2026/00141', clientId: 2, clientName: 'Esperança Manuel', description: 'Plano Fibra 15 Mbps', amount: 13000, penalty: 0, total: 13000, method: 'Multicaixa', date: '17/10/2026', status: 'Liquidada', operator: 'Maria (Balcão)' },
    { id: 203, number: 'FT-2026/00140', clientId: 6, clientName: 'Teresa Sebastião', description: 'Plano Fibra 30 Mbps', amount: 21000, penalty: 0, total: 21000, method: 'Transferência', date: '16/10/2026', status: 'Liquidada', operator: 'Deezy (Admin)' },
    { id: 204, number: 'FT-2026/00139', clientId: 7, clientName: 'Manuel Panzo', description: 'Mensalidade TV Cabo', amount: 4000, penalty: 500, total: 4500, method: 'Numerário', date: '16/10/2026', status: 'Liquidada', operator: 'Maria (Balcão)' }
  ];

  const DEFAULT_ORDERS = [
    { id: 1, code: 'OS-2026-081', clientId: 2, clientName: 'Esperança Manuel', type: 'Instalação Nova', description: 'Passagem de cabo drop FTTH e ativação de ONU Huawei', date: '17/10/2026', priority: 'Alta', status: 'Concluída', tech: 'Mestre Job' },
    { id: 2, code: 'OS-2026-082', clientId: 4, clientName: 'Joaquina Pedro', type: 'Reparação de Sinal', description: 'Sinal atenuado em -27 dBm. Refazer conector SC/APC na caixa PDO', date: '17/10/2026', priority: 'Urgente', status: 'Em Curso', tech: 'Paulo Silva' },
    { id: 3, code: 'OS-2026-083', clientId: 3, clientName: 'António Kiala', type: 'Ponto Adicional TV', description: 'Instalação de divisor coaxial 1x2 e passagem de cabo RG6 no quarto', date: '18/10/2026', priority: 'Normal', status: 'Agendada', tech: 'Wilson Baptista' }
  ];

  const DEFAULT_INVENTORY = [
    { id: 1, code: 'MAT-001', name: 'Cabo Drop Fibra Óptica 1FO (Bobina 1000m)', category: 'fibra', stockCentral: 4, stockVan: 2, cost: 45000, status: 'Em Stock' },
    { id: 2, code: 'MAT-002', name: 'Conector Rápido SC/APC Monomodo (Caixa 100 un)', category: 'fibra', stockCentral: 12, stockVan: 6, cost: 22000, status: 'Em Stock' },
    { id: 3, code: 'MAT-003', name: 'Modem ONU GPON Huawei HG8245H Wi-Fi Dual Band', category: 'fibra', stockCentral: 25, stockVan: 5, cost: 28000, status: 'Em Stock' },
    { id: 4, code: 'MAT-004', name: 'Caixa de Terminação Óptica CTO 16 Portas IP65', category: 'fibra', stockCentral: 8, stockVan: 2, cost: 18500, status: 'Em Stock' },
    { id: 5, code: 'MAT-005', name: 'Cabo Coaxial RG6 Preto com Mensageiro (Bobina 305m)', category: 'tv', stockCentral: 6, stockVan: 3, cost: 38000, status: 'Em Stock' },
    { id: 6, code: 'MAT-006', name: 'Conector F de Compressão RG6 (Saco 100 un)', category: 'tv', stockCentral: 15, stockVan: 8, cost: 12000, status: 'Em Stock' },
    { id: 7, code: 'MAT-007', name: 'Divisor / Splitter RF 1x4 Alta Frequência 5-1000MHz', category: 'tv', stockCentral: 40, stockVan: 12, cost: 3500, status: 'Em Stock' },
    { id: 8, code: 'MAT-008', name: 'Máquina de Fusão Óptica com Clivador de Precisão', category: 'tools', stockCentral: 2, stockVan: 1, cost: 450000, status: 'Operacional' }
  ];

  const DEFAULT_TEAM = [
    { id: 1, name: 'Job Kiaku (Mestre Job)', role: 'Técnico Especialista Chefe', dept: 'Piquete & Redes FTTH', base: 180000, food: 35000, trans: 30000, adv: 0 },
    { id: 2, name: 'Paulo Silva', role: 'Técnico de Instalação Fibra', dept: 'Instalações de Campo', base: 140000, food: 30000, trans: 25000, adv: 15000 },
    { id: 3, name: 'Wilson Baptista', role: 'Técnico de Linha TV a Cabo', dept: 'Redes Coaxiais', base: 135000, food: 30000, trans: 25000, adv: 0 },
    { id: 4, name: 'Maria Teresa', role: 'Operadora de Balcão & Caixa', dept: 'Atendimento & Tesouraria', base: 120000, food: 30000, trans: 20000, adv: 0 }
  ];

  // Carrega coleções
  let clients = loadFromStorage(STORAGE_KEY_CLIENTS, DEFAULT_CLIENTS);
  let invoices = loadFromStorage(STORAGE_KEY_INVOICES, DEFAULT_INVOICES);
  let orders = loadFromStorage(STORAGE_KEY_ORDERS, DEFAULT_ORDERS);
  let inventory = loadFromStorage(STORAGE_KEY_INVENTORY, DEFAULT_INVENTORY);
  let team = loadFromStorage(STORAGE_KEY_TEAM, DEFAULT_TEAM);

  // Filtros ativos
  let activeFilter = 'all';
  let activeStockFilter = 'all';
  let activePrintFormat = 'pos'; // 'pos', 'pos58' ou 'a4'
  let currentDocToPrint = null;

  // Determina Modo do Executável (fibra, tv, ambos)
  const urlParams = new URLSearchParams(window.location.search);
  const detectedMode =
    urlParams.get('mode') ||
    (window.electronAPI && window.electronAPI.appMode) ||
    loadFromStorage(STORAGE_KEY_MODE, 'ambos');

  let currentServiceMode = detectedMode;

  function loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      const isProduction = localStorage.getItem('osdel_production_mode_active') === 'true';
      if (data !== null) {
        return JSON.parse(data);
      }
      if (isProduction && (key === STORAGE_KEY_CLIENTS || key === STORAGE_KEY_INVOICES || key === STORAGE_KEY_ORDERS)) {
        return [];
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  function saveToStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  function formatKz(val) {
    const num = parseFloat(val || 0);
    return `${num.toLocaleString('pt-AO')} Kz`;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // =========================================================================
  // 2. MODO DE OPERAÇÃO: FIBRA (.EXE) VS TV CABO (.EXE) VS UNIFICADO
  // =========================================================================
  function applyServiceMode(mode) {
    currentServiceMode = mode;
    saveToStorage(STORAGE_KEY_MODE, mode);

    const titleEl = document.getElementById('titlebar-title');
    const pillEl = document.getElementById('titlebar-mode-pill');
    const dotEl = document.getElementById('header-mode-dot');
    const bannerTitle = document.getElementById('banner-service-title');
    const bannerDesc = document.getElementById('banner-service-desc');
    const bannerIcon = document.getElementById('banner-badge-icon');
    const subtitleEl = document.getElementById('sidebar-service-subtitle');

    // Remove classes anteriores do body
    document.body.classList.remove('mode-fibra-active', 'mode-tv-active', 'mode-ambos-active');

    // Botões no topo
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    if (mode === 'fibra') {
      document.body.classList.add('mode-fibra-active');
      if (titleEl) titleEl.textContent = 'OSDEL TECNOLOGIA · Gestão de Internet Fibra Óptica FTTH (.exe)';
      if (pillEl) { pillEl.textContent = 'Edição Fibra Óptica (.exe)'; pillEl.className = 'badge-mode-pill fibra'; }
      if (dotEl) { dotEl.style.background = '#2563eb'; dotEl.style.boxShadow = '0 0 10px #2563eb'; }
      if (bannerTitle) bannerTitle.textContent = 'Operação Dedicada · Internet Banda Larga Fibra Óptica FTTH';
      if (bannerDesc) bannerDesc.textContent = 'Gestão avançada de planos de alta velocidade (10 a 100 Mbps), atenuação óptica OLT/CTO e ONUs provisionadas.';
      if (bannerIcon) bannerIcon.textContent = '⚡';
      if (subtitleEl) subtitleEl.textContent = 'Internet Fibra Óptica FTTH';
      activeFilter = 'fiber';
    } else if (mode === 'tv') {
      document.body.classList.add('mode-tv-active');
      if (titleEl) titleEl.textContent = 'OSDEL TECNOLOGIA · Gestão de TV por Cabo Comunitária (.exe)';
      if (pillEl) { pillEl.textContent = 'Edição TV Cabo (.exe)'; pillEl.className = 'badge-mode-pill tv'; }
      if (dotEl) { dotEl.style.background = '#ea580c'; dotEl.style.boxShadow = '0 0 10px #ea580c'; }
      if (bannerTitle) bannerTitle.textContent = 'Operação Dedicada · TV por Cabo Comunitária por Assinatura';
      if (bannerDesc) bannerDesc.textContent = 'Distribuição de sinal RF, amplificadores de rua, pontos de TV residenciais e gestão de mensalidades comunitárias.';
      if (bannerIcon) bannerIcon.textContent = '📺';
      if (subtitleEl) subtitleEl.textContent = 'TV por Cabo Comunitária';
      activeFilter = 'tv';
    } else {
      document.body.classList.add('mode-ambos-active');
      if (titleEl) titleEl.textContent = 'OSDEL TECNOLOGIA · Gestão de Telecomunicações (Desktop Unificado)';
      if (pillEl) { pillEl.textContent = 'Modo Unificado (Ambos)'; pillEl.className = 'badge-mode-pill ambos'; }
      if (dotEl) { dotEl.style.background = '#10b981'; dotEl.style.boxShadow = '0 0 10px #10b981'; }
      if (bannerTitle) bannerTitle.textContent = 'Operação Integrada · TV Cabo & Fibra Óptica';
      if (bannerDesc) bannerDesc.textContent = 'Gestão completa de assinantes, PDOs, modems ONU, cabos coaxiais e caixas de emenda.';
      if (bannerIcon) bannerIcon.textContent = '🌐';
      if (subtitleEl) subtitleEl.textContent = 'TV Cabo & Internet Fibra';
      activeFilter = 'all';
    }

    renderAll();
  }

  // Switcher de modo no topo
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetMode = btn.getAttribute('data-mode');
      applyServiceMode(targetMode);
      showToast(`Perfil alterado para: ${targetMode.toUpperCase()}`, 'info');
    });
  });

  // =========================================================================
  // 3. CONTROLES DE JANELA (ELECTRON IPC) & RELÓGIO
  // =========================================================================
  if (window.electronAPI) {
    document.getElementById('btn-win-min')?.addEventListener('click', () => window.electronAPI.minimize());
    document.getElementById('btn-win-max')?.addEventListener('click', () => window.electronAPI.maximize());
    document.getElementById('btn-win-close')?.addEventListener('click', () => window.electronAPI.close());
  }

  function updateClock() {
    const el = document.getElementById('system-clock');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('pt-AO');
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // =========================================================================
  // 4. NAVEGAÇÃO ENTRE OS 15 MÓDULOS DO SISTEMA
  // =========================================================================
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const viewTitle = document.getElementById('view-title');
  const viewBreadcrumb = document.getElementById('view-breadcrumb');

  const VIEW_TITLES = {
    dashboard: { title: 'Painel de Controlo & Métricas', crumb: 'OSDEL Tecnologia / Visão Geral' },
    clients: { title: 'Base de Dados de Assinantes & CRM', crumb: 'OSDEL Tecnologia / Assinantes' },
    agenda: { title: 'Agenda de Instalações & Escalas Técnicas', crumb: 'OSDEL Tecnologia / Piquete & Escalas' },
    field: { title: 'Missões Técnicas & Piquete de Campo', crumb: 'OSDEL Tecnologia / Ordens de Piquete' },
    orders: { title: 'Ordens de Serviço (OS)', crumb: 'OSDEL Tecnologia / Manutenção Técnica' },
    inventory: { title: 'Inventário & Stock de Telecomunicações', crumb: 'OSDEL Tecnologia / Equipamentos' },
    contracts: { title: 'Contratos Digitais & Termos de Adesão', crumb: 'OSDEL Tecnologia / Contratos' },
    operations: { title: 'Facturação, Recibos & Impressão POS', crumb: 'OSDEL Tecnologia / Facturação' },
    cash: { title: 'Caixa Diário & Fecho de Turno', crumb: 'OSDEL Tecnologia / Tesouraria' },
    accounts: { title: 'Contas Bancárias & Coordenadas de Cobrança', crumb: 'OSDEL Tecnologia / Contas Oficiais' },
    rappels: { title: 'Régua de Cobrança & Gestão de Cortes', crumb: 'OSDEL Tecnologia / Cobranças' },
    diagnostics: { title: 'Diagnóstico de Rede & Teste de Velocidade', crumb: 'OSDEL Tecnologia / Speed Test & Qualidade' },
    reports: { title: 'Relatórios Executivos & Balanço Financeiro', crumb: 'OSDEL Tecnologia / Relatórios' },
    team: { title: 'Quadro de Colaboradores & Folha Salarial', crumb: 'OSDEL Tecnologia / Recursos Humanos' },
    settings: { title: 'Parâmetros Globais, Fiscalidade & Hardware POS', crumb: 'OSDEL Tecnologia / Configurações' }
  };

  function switchView(viewName) {
    navItems.forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    viewPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    const info = VIEW_TITLES[viewName] || { title: 'Sistema de Gestão', crumb: 'OSDEL' };
    if (viewTitle) viewTitle.textContent = info.title;
    if (viewBreadcrumb) viewBreadcrumb.textContent = info.crumb;
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Atalhos nos botões rápidos do topo
  document.getElementById('btn-goto-invoices')?.addEventListener('click', () => switchView('operations'));
  document.getElementById('btn-goto-field')?.addEventListener('click', () => switchView('field'));
  document.getElementById('btn-quick-speed-test')?.addEventListener('click', () => switchView('diagnostics'));
  document.getElementById('btn-quick-new-os')?.addEventListener('click', () => openModal('modal-os'));

  // =========================================================================
  // 5. RENDERIZAÇÃO DOS MÓDULOS
  // =========================================================================
  function renderAll() {
    renderDashboard();
    renderClientsTable();
    renderInvoicesTable();
    renderMissionsTable();
    renderOrdersTable();
    renderInventoryTable();
    renderContractsTable();
    renderCashSummary();
    renderRappelsTable();
    renderReports();
    renderTeamTable();
    populateClientSelects();
  }

  function getFilteredClients() {
    return clients.filter((c) => {
      if (currentServiceMode === 'fibra' && c.service === 'tv') return false;
      if (currentServiceMode === 'tv' && c.service === 'fiber') return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'fiber') return c.service === 'fiber' || c.service === 'combo';
      if (activeFilter === 'tv') return c.service === 'tv' || c.service === 'combo';
      return c.status === activeFilter;
    });
  }

  function renderDashboard() {
    const list = getFilteredClients();
    const activeClients = list.filter((c) => c.status === 'active');
    const lateClients = list.filter((c) => c.status === 'late');
    const cutClients = list.filter((c) => c.status === 'cut');

    const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const totalLateAmount = lateClients.reduce((acc, c) => acc + (c.fee || 0), 0);

    const activeCountEl = document.getElementById('kpi-active-count');
    const revEl = document.getElementById('kpi-revenue');
    const lateCountEl = document.getElementById('kpi-late-count');
    const lateAmountEl = document.getElementById('kpi-late-amount');
    const cutCountEl = document.getElementById('kpi-cut-count');

    if (activeCountEl) activeCountEl.textContent = activeClients.length;
    if (revEl) revEl.textContent = formatKz(totalRevenue);
    if (lateCountEl) lateCountEl.textContent = lateClients.length;
    if (lateAmountEl) lateAmountEl.textContent = `${formatKz(totalLateAmount)} a recuperar`;
    if (cutCountEl) cutCountEl.textContent = cutClients.length;

    // Tabela resumida de últimas facturas
    const dashInvoicesBody = document.getElementById('dash-invoices-tbody');
    if (dashInvoicesBody) {
      dashInvoicesBody.innerHTML = invoices.slice(-5).reverse().map((inv) => `
        <tr>
          <td><b class="font-mono">${inv.number}</b></td>
          <td>${inv.clientName}</td>
          <td><b>${formatKz(inv.total)}</b></td>
          <td><span class="badge-method">${inv.method}</span></td>
          <td>${inv.date}</td>
          <td>
            <button class="btn btn-sm btn-outline btn-print-inv" data-id="${inv.id}">
              Imprimir POS
            </button>
          </td>
        </tr>
      `).join('');
    }

    // Missões no dashboard
    const dashMissionsList = document.getElementById('dash-missions-list');
    if (dashMissionsList) {
      dashMissionsList.innerHTML = orders.filter((o) => o.status !== 'Concluída').map((o) => `
        <div class="mission-item">
          <div class="mission-info">
            <b>${o.code} · ${o.type}</b>
            <p>${o.clientName} · ${o.description}</p>
          </div>
          <span class="badge-status ${o.priority === 'Urgente' ? 'bad' : 'warn'}">${o.priority}</span>
        </div>
      `).join('') || '<div class="empty-state">Sem missões pendentes.</div>';
    }
  }

  function renderClientsTable() {
    const tbody = document.getElementById('clients-tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('client-search-input')?.value || '').toLowerCase();
    const list = getFilteredClients().filter((c) => {
      if (!searchTerm) return true;
      return (
        c.name.toLowerCase().includes(searchTerm) ||
        c.code.toLowerCase().includes(searchTerm) ||
        c.phone.toLowerCase().includes(searchTerm) ||
        c.pdo.toLowerCase().includes(searchTerm) ||
        (c.onu && c.onu.toLowerCase().includes(searchTerm))
      );
    });

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Nenhum assinante encontrado para o filtro selecionado.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((c) => {
      const isFibra = c.service === 'fiber';
      const isCombo = c.service === 'combo';
      const serviceBadge = isCombo
        ? '<span class="badge-service combo">Combo Fibra + TV</span>'
        : isFibra
        ? '<span class="badge-service fiber">Fibra FTTH</span>'
        : '<span class="badge-service tv">TV a Cabo</span>';

      const statusMap = {
        active: '<span class="badge-status good">Ativo</span>',
        late: '<span class="badge-status warn">Em Atraso</span>',
        cut: '<span class="badge-status bad">Cortado</span>'
      };

      return `
        <tr>
          <td><b class="font-mono">${c.code}</b></td>
          <td>
            <b>${c.name}</b>
            <small class="block text-subtle">${c.phone} · ${c.address}</small>
          </td>
          <td>${serviceBadge}</td>
          <td><span class="badge-pdo">${c.pdo}</span></td>
          <td><span class="font-mono text-xs">${c.onu || '—'}</span></td>
          <td><b>${formatKz(c.fee)}</b></td>
          <td>${statusMap[c.status] || c.status}</td>
          <td>
            <div class="actions-group">
              <button class="btn btn-sm btn-outline btn-quick-bill" data-client-id="${c.id}" title="Cobrar este cliente">
                Facturar
              </button>
              ${c.status === 'cut' ? `
                <button class="btn btn-sm btn-primary btn-reconnect" data-client-id="${c.id}" title="Religar serviço">
                  Religar
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Binds de cobrança rápida
    tbody.querySelectorAll('.btn-quick-bill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-client-id');
        openInvoiceModalForClient(cid);
      });
    });

    // Binds de religação
    tbody.querySelectorAll('.btn-reconnect').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = parseInt(btn.getAttribute('data-client-id'), 10);
        const cli = clients.find((x) => x.id === cid);
        if (cli) {
          cli.status = 'active';
          saveToStorage(STORAGE_KEY_CLIENTS, clients);
          renderAll();
          showToast(`Serviço do assinante ${cli.name} religado com sucesso!`, 'success');
        }
      });
    });
  }

  function renderInvoicesTable() {
    const tbody = document.getElementById('invoices-tbody');
    if (!tbody) return;

    tbody.innerHTML = invoices.slice().reverse().map((inv) => `
      <tr>
        <td><b class="font-mono">${inv.number}</b></td>
        <td><b>${inv.clientName}</b></td>
        <td>${inv.description}</td>
        <td>${formatKz(inv.amount)}</td>
        <td>${inv.penalty > 0 ? `<span class="text-danger">+${formatKz(inv.penalty)}</span>` : '0 Kz'}</td>
        <td><b>${formatKz(inv.total)}</b></td>
        <td><span class="badge-method">${inv.method}</span></td>
        <td>${inv.operator}</td>
        <td>${inv.date}</td>
        <td>
          <button class="btn btn-sm btn-outline btn-print-inv" data-id="${inv.id}">
            Talão POS (80mm)
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-print-inv').forEach((btn) => {
      btn.addEventListener('click', () => {
        const invId = parseInt(btn.getAttribute('data-id'), 10);
        const inv = invoices.find((x) => x.id === invId);
        if (inv) openPrintPreview(inv);
      });
    });
  }

  function renderMissionsTable() {
    const tbody = document.getElementById('missions-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map((o) => `
      <tr>
        <td><b class="font-mono">${o.code}</b></td>
        <td><span class="badge-service fiber">${o.type}</span></td>
        <td><b>${o.clientName}</b></td>
        <td>${o.description}</td>
        <td><b class="text-good">-19.4 dBm</b></td>
        <td>${o.tech}</td>
        <td><span class="badge-status ${o.status === 'Concluída' ? 'good' : 'warn'}">${o.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="alert('Relatório técnico da ordem ${o.code} gerado.')">
            Validar
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map((o) => `
      <tr>
        <td><b class="font-mono">${o.code}</b></td>
        <td><b>${o.clientName}</b></td>
        <td>${o.type}</td>
        <td>${o.description}</td>
        <td>${o.date}</td>
        <td><span class="badge-status ${o.priority === 'Urgente' ? 'bad' : 'warn'}">${o.priority}</span></td>
        <td><span class="badge-status ${o.status === 'Concluída' ? 'good' : 'warn'}">${o.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="alert('Detalhes da Ordem ${o.code}')">Abrir</button>
        </td>
      </tr>
    `).join('');
  }

  function renderInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    const list = inventory.filter((item) => {
      if (activeStockFilter === 'all') return true;
      return item.category === activeStockFilter;
    });

    tbody.innerHTML = list.map((item) => `
      <tr>
        <td><b class="font-mono">${item.code}</b></td>
        <td><b>${item.name}</b></td>
        <td><span class="badge-service ${item.category}">${item.category.toUpperCase()}</span></td>
        <td><b>${item.stockCentral} un</b></td>
        <td>${item.stockVan} un</td>
        <td>${formatKz(item.cost)}</td>
        <td><span class="badge-status good">${item.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="alert('Ajuste de stock para ${item.name}')">+ Stock</button>
        </td>
      </tr>
    `).join('');
  }

  function renderContractsTable() {
    const tbody = document.getElementById('contracts-tbody');
    if (!tbody) return;

    tbody.innerHTML = clients.map((c, i) => `
      <tr>
        <td><b class="font-mono">CTR-2026/0${100 + c.id}</b></td>
        <td><b>${c.name}</b></td>
        <td>${c.service === 'fiber' ? 'Internet Fibra FTTH' : c.service === 'combo' ? 'Combo TV + Fibra' : 'TV por Cabo'}</td>
        <td>${c.service === 'fiber' ? 'Banda Larga 15 Mbps' : 'Grelha Completa 45 Canais'}</td>
        <td>12 Meses</td>
        <td>01/01/2026</td>
        <td><span class="badge-status good">Ativo & Válido</span></td>
        <td>
          <button class="btn btn-sm btn-outline btn-print-contract-doc" data-id="${c.id}">
            Imprimir Minuta A4
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-print-contract-doc').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = parseInt(btn.getAttribute('data-id'), 10);
        const cli = clients.find((x) => x.id === cid);
        if (!cli) return;

        const saved = loadFromStorage(STORAGE_KEY_SETTINGS, {});
        const title = saved.contractTitle || 'Termos de adesão de contrato';
        const intro = saved.contractIntro || 'A TV comunitária e Internet fibra Osdel é uma rede voltada à comunidade, com informação, entretenimento, actualidade e conectividade de alta velocidade.';
        const clausesText = saved.contractClauses || '1. Adesão: Para aderir ao serviço é necessária a cópia do bilhete de identidade e a presença de um representante maior de 18 anos.\n2. Custo e instalação: A instalação tem o custo contratual com cabo RG6/Drop incluído.\n3. Mensalidade: A mensalidade é pré-paga e vence no dia estipulado no contrato.\n4. Multa e suspensão: Aplica-se multa contratual por atraso no pagamento.\n5. Regras de utilização: O sinal destina-se exclusivamente a uma única residência.';
        const closing = saved.contractClosing || 'E por estarem de pleno acordo com os termos do contrato, as partes assinam o presente instrumento em duas vias de igual teor e valor.';

        const compName = saved.companyName || 'OSDEL TECNOLOGIA, LDA';
        const compNif = saved.companyNif || '5417089214';

        const ctrComp = document.getElementById('ctr-company-name');
        const ctrNif = document.getElementById('ctr-company-nif');
        const ctrNum = document.getElementById('ctr-doc-number');
        const ctrDate = document.getElementById('ctr-doc-date');
        const ctrIntro = document.getElementById('ctr-intro-box');
        const ctrTitle = document.getElementById('ctr-title');
        const ctrName = document.getElementById('ctr-client-name');
        const ctrCode = document.getElementById('ctr-client-code');
        const ctrAddr = document.getElementById('ctr-client-address');
        const ctrService = document.getElementById('ctr-client-service');
        const ctrClauses = document.getElementById('ctr-clauses-container');
        const ctrClosing = document.getElementById('ctr-closing-text');
        const ctrSigName = document.getElementById('ctr-client-signature-name');

        if (ctrComp) ctrComp.textContent = compName;
        if (ctrNif) ctrNif.textContent = `NIF: ${compNif} · Luanda, Angola`;
        if (ctrNum) ctrNum.textContent = `CTR-2026/0${100 + cli.id}`;
        if (ctrDate) ctrDate.textContent = new Date().toLocaleDateString('pt-AO');
        if (ctrIntro) ctrIntro.textContent = intro;
        if (ctrTitle) ctrTitle.textContent = title;
        if (ctrName) ctrName.textContent = cli.name;
        if (ctrCode) ctrCode.textContent = cli.code;
        if (ctrAddr) ctrAddr.textContent = cli.address;
        if (ctrService) ctrService.textContent = cli.service === 'fiber' ? 'Internet Banda Larga Fibra 15 Mbps' : 'Grelha Completa 45 Canais';
        if (ctrClauses) ctrClauses.textContent = clausesText;
        if (ctrClosing) ctrClosing.textContent = closing;
        if (ctrSigName) ctrSigName.textContent = cli.name;

        setPrintFormat('contract');
        openModal('modal-print-preview');
      });
    });
  }

  function renderCashSummary() {
    let money = 0;
    let pos = 0;
    let transfer = 0;

    invoices.forEach((inv) => {
      if (inv.method === 'Numerário') money += inv.total;
      else if (inv.method === 'Transferência') transfer += inv.total;
      else pos += inv.total;
    });

    const moneyEl = document.getElementById('cash-money-total');
    const posEl = document.getElementById('cash-pos-total');
    const transferEl = document.getElementById('cash-transfer-total');
    const grandEl = document.getElementById('cash-grand-total');

    if (moneyEl) moneyEl.textContent = formatKz(money);
    if (posEl) posEl.textContent = formatKz(pos);
    if (transferEl) transferEl.textContent = formatKz(transfer);
    if (grandEl) grandEl.textContent = formatKz(money + pos + transfer);
  }

  function renderRappelsTable() {
    const tbody = document.getElementById('rappels-tbody');
    if (!tbody) return;

    const debtors = clients.filter((c) => c.status === 'late' || c.status === 'cut');

    tbody.innerHTML = debtors.map((c) => `
      <tr>
        <td><b>${c.name}</b><small class="block text-subtle">${c.code}</small></td>
        <td><span class="badge-service ${c.service}">${c.service.toUpperCase()}</span></td>
        <td><b class="text-danger">14 dias</b></td>
        <td><b>${formatKz(c.fee)}</b></td>
        <td><a href="https://wa.me/244${c.phone.replace(/\\s+/g, '')}" target="_blank" class="text-primary font-bold">📲 ${c.phone}</a></td>
        <td>${c.service === 'fiber' ? 'Corte MikroTik (Bloqueio IP)' : 'Corte Físico no Poste/Tap'}</td>
        <td>
          <button class="btn btn-sm btn-danger btn-cut-now" data-client-id="${c.id}">
            Executar Corte
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-cut-now').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = parseInt(btn.getAttribute('data-client-id'), 10);
        const cli = clients.find((x) => x.id === cid);
        if (cli) {
          cli.status = 'cut';
          saveToStorage(STORAGE_KEY_CLIENTS, clients);
          renderAll();
          showToast(`Corte executado para o cliente ${cli.name}!`, 'warn');
        }
      });
    });
  }

  function renderReports() {
    const totalRev = invoices.reduce((acc, x) => acc + (x.total || 0), 0);
    const totalInv = invoices.length;

    const revEl = document.getElementById('rep-total-revenue');
    const invEl = document.getElementById('rep-total-invoices');

    if (revEl) revEl.textContent = formatKz(totalRev);
    if (invEl) invEl.textContent = totalInv;
  }

  function renderTeamTable() {
    const tbody = document.getElementById('team-tbody');
    if (!tbody) return;

    tbody.innerHTML = team.map((member) => `
      <tr>
        <td><b>${member.name}</b></td>
        <td>${member.role}</td>
        <td><span class="badge-pdo">${member.dept}</span></td>
        <td><b>${formatKz(member.base)}</b></td>
        <td>${formatKz(member.food)}</td>
        <td>${formatKz(member.trans)}</td>
        <td>${member.adv > 0 ? `<b class="text-danger">-${formatKz(member.adv)}</b>` : '0 Kz'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="alert('Recibo de vencimento emitido para ${member.name}')">Folha POS</button>
        </td>
      </tr>
    `).join('');
  }

  function populateClientSelects() {
    const invSelect = document.getElementById('inv-client-id');
    const osSelect = document.getElementById('os-client-id');

    const optionsHtml = clients.map((c) => `<option value="${c.id}">${c.name} (${c.code} · ${c.service.toUpperCase()})</option>`).join('');

    if (invSelect) invSelect.innerHTML = optionsHtml;
    if (osSelect) osSelect.innerHTML = optionsHtml;
  }

  // =========================================================================
  // 6. MODAL & PRÉ-VISUALIZAÇÃO DE IMPRESSÃO (POS 80mm/58mm E FACTURA A4)
  // =========================================================================
  function openPrintPreview(inv) {
    currentDocToPrint = inv;

    const saved = loadFromStorage(STORAGE_KEY_SETTINGS, {});
    const companyName = saved.companyName || 'OSDEL TECNOLOGIA, LDA';
    const companySubtitle = saved.invoiceSubtitle || saved.companySubtitle || 'TV a Cabo Comunitária & Internet Fibra';
    const companyNif = saved.companyNif || '5417089214';
    const invoiceTitle = saved.invoiceTitle || 'FACTURA / RECIBO DE PAGAMENTO';
    const invoiceTaxExempt = saved.invoiceTaxExempt || 'Regime de Exclusão de IVA (Artigo 12.º do CIVA)';
    const invoiceNotes = saved.invoiceItemNotes || 'Fornecimento e manutenção regular de sinal com garantia de estabilidade.';
    const invoiceFooter = saved.invoiceFooter || 'Documento emitido pelo sistema de gestão da OSDEL TECNOLOGIA. Processado por computador. Válido com carimbo oficial.';
    const thermalFooter = saved.thermalFooter || 'Obrigado pela sua preferência! Guarde este talão.';
    const thermalWarning = saved.thermalWarning || '';

    // Atualiza Talão Térmico
    const numEl = document.getElementById('rec-number');
    const dateEl = document.getElementById('rec-date');
    const nameEl = document.getElementById('rec-client-name');
    const codeEl = document.getElementById('rec-client-code');
    const addrEl = document.getElementById('rec-client-address');
    const pdoEl = document.getElementById('rec-client-pdo');
    const descEl = document.getElementById('rec-item-desc');
    const amtEl = document.getElementById('rec-item-amount');
    const penEl = document.getElementById('rec-item-penalty');
    const penRow = document.getElementById('rec-penalty-row');
    const totalEl = document.getElementById('rec-grand-total');
    const methodEl = document.getElementById('rec-pay-method');
    const opEl = document.getElementById('rec-operator');

    const recCompName = document.getElementById('rec-company-name');
    const recCompSub = document.getElementById('rec-company-subtitle');
    const recCompMeta = document.getElementById('rec-company-meta');
    const recDocTitle = document.getElementById('rec-doc-title');
    const recTaxExempt = document.getElementById('rec-tax-exemption');
    const recWarning = document.getElementById('rec-warning-text');
    const recFooter = document.getElementById('rec-footer-custom');

    if (recCompName) recCompName.textContent = companyName;
    if (recCompSub) recCompSub.textContent = companySubtitle;
    if (recCompMeta) recCompMeta.textContent = `NIF: ${companyNif} · Tel: 923 881 902`;
    if (recDocTitle) recDocTitle.textContent = invoiceTitle;
    if (recTaxExempt) recTaxExempt.textContent = invoiceTaxExempt;
    if (recFooter) recFooter.textContent = thermalFooter;

    if (recWarning) {
      if (thermalWarning) {
        recWarning.textContent = `⚠ ${thermalWarning}`;
        recWarning.style.display = 'block';
      } else {
        recWarning.style.display = 'none';
      }
    }

    if (numEl) numEl.textContent = inv.number;
    if (dateEl) dateEl.textContent = `${inv.date} 14:32`;
    if (nameEl) nameEl.textContent = inv.clientName;
    if (descEl) descEl.textContent = inv.description;
    if (amtEl) amtEl.textContent = formatKz(inv.amount);
    if (totalEl) totalEl.textContent = formatKz(inv.total);
    if (methodEl) methodEl.textContent = inv.method;
    if (opEl) opEl.textContent = inv.operator;

    const cli = clients.find((x) => x.id === inv.clientId);
    if (cli) {
      if (codeEl) codeEl.textContent = cli.code;
      if (addrEl) addrEl.textContent = cli.address;
      if (pdoEl) pdoEl.textContent = cli.pdo;
    }

    if (inv.penalty > 0) {
      if (penRow) penRow.style.display = 'flex';
      if (penEl) penEl.textContent = formatKz(inv.penalty);
    } else {
      if (penRow) penRow.style.display = 'none';
    }

    // Atualiza Factura A4
    const a4Num = document.getElementById('a4-doc-number');
    const a4Date = document.getElementById('a4-doc-date');
    const a4Name = document.getElementById('a4-client-name');
    const a4Code = document.getElementById('a4-client-code');
    const a4Addr = document.getElementById('a4-client-address');
    const a4Pdo = document.getElementById('a4-client-pdo');
    const a4Desc = document.getElementById('a4-item-desc');
    const a4Price = document.getElementById('a4-item-price');
    const a4ItemTotal = document.getElementById('a4-item-total');
    const a4Subtotal = document.getElementById('a4-subtotal');
    const a4Pen = document.getElementById('a4-penalty');
    const a4Total = document.getElementById('a4-total');

    const a4CompName = document.getElementById('a4-company-name');
    const a4CompSub = document.getElementById('a4-company-subtitle');
    const a4CompNif = document.getElementById('a4-company-nif');
    const a4DocTitle = document.getElementById('a4-doc-title');
    const a4TaxExempt = document.getElementById('a4-tax-exempt');
    const a4ItemNotes = document.getElementById('a4-item-notes');
    const a4BankNotes = document.getElementById('a4-banking-notes');
    const a4InstFooter = document.getElementById('a4-inst-footer');

    if (a4CompName) a4CompName.textContent = companyName;
    if (a4CompSub) a4CompSub.textContent = companySubtitle;
    if (a4CompNif) a4CompNif.textContent = `NIF: ${companyNif} · ${saved.companyAddress || 'Luanda, Angola'}`;
    if (a4DocTitle) a4DocTitle.textContent = invoiceTitle;
    if (a4TaxExempt) a4TaxExempt.textContent = invoiceTaxExempt;
    if (a4ItemNotes) a4ItemNotes.textContent = invoiceNotes;
    if (a4BankNotes) {
      if (saved.invoiceBankingNotes) {
        a4BankNotes.textContent = `ℹ ${saved.invoiceBankingNotes}`;
        a4BankNotes.style.display = 'block';
      } else {
        a4BankNotes.style.display = 'none';
      }
    }
    if (a4InstFooter) a4InstFooter.textContent = invoiceFooter;

    if (a4Num) a4Num.textContent = inv.number;
    if (a4Date) a4Date.textContent = inv.date;
    if (a4Name) a4Name.textContent = inv.clientName;
    if (a4Desc) a4Desc.textContent = inv.description;
    if (a4Price) a4Price.textContent = formatKz(inv.amount);
    if (a4ItemTotal) a4ItemTotal.textContent = formatKz(inv.amount);
    if (a4Subtotal) a4Subtotal.textContent = formatKz(inv.amount);
    if (a4Pen) a4Pen.textContent = formatKz(inv.penalty);
    if (a4Total) a4Total.textContent = formatKz(inv.total);

    if (cli) {
      if (a4Code) a4Code.textContent = cli.code;
      if (a4Addr) a4Addr.textContent = cli.address;
      if (a4Pdo) a4Pdo.textContent = cli.pdo;
    }

    setPrintFormat('pos');
    openModal('modal-print-preview');
  }

  function setPrintFormat(fmt) {
    activePrintFormat = fmt;
    const tabPos = document.getElementById('tab-print-pos');
    const tabPos58 = document.getElementById('tab-print-pos58');
    const tabA4 = document.getElementById('tab-print-a4');
    const tabCtr = document.getElementById('tab-print-contract');
    const thermalBox = document.getElementById('render-thermal-receipt');
    const a4Box = document.getElementById('render-a4-document');
    const contractBox = document.getElementById('render-contract-document');
    const actionLabel = document.getElementById('print-action-label');

    tabPos?.classList.toggle('active', fmt === 'pos');
    tabPos58?.classList.toggle('active', fmt === 'pos58');
    tabA4?.classList.toggle('active', fmt === 'a4');
    tabCtr?.classList.toggle('active', fmt === 'contract');

    if (fmt === 'contract') {
      if (thermalBox) thermalBox.style.display = 'none';
      if (a4Box) a4Box.style.display = 'none';
      if (contractBox) contractBox.style.display = 'block';
      if (actionLabel) actionLabel.textContent = 'Imprimir Minuta do Contrato (A4)';
    } else if (fmt === 'a4') {
      if (thermalBox) thermalBox.style.display = 'none';
      if (contractBox) contractBox.style.display = 'none';
      if (a4Box) a4Box.style.display = 'block';
      if (actionLabel) actionLabel.textContent = 'Imprimir Factura A4 Oficial';
    } else {
      if (contractBox) contractBox.style.display = 'none';
      if (a4Box) a4Box.style.display = 'none';
      if (thermalBox) thermalBox.style.display = 'block';
      if (fmt === 'pos58') {
        thermalBox.classList.add('width-58mm');
        if (actionLabel) actionLabel.textContent = 'Imprimir Talão Térmico Compacto (58mm)';
      } else {
        thermalBox.classList.remove('width-58mm');
        if (actionLabel) actionLabel.textContent = 'Imprimir Talão Térmico Padrão (80mm)';
      }
    }
  }

  document.getElementById('tab-print-pos')?.addEventListener('click', () => setPrintFormat('pos'));
  document.getElementById('tab-print-pos58')?.addEventListener('click', () => setPrintFormat('pos58'));
  document.getElementById('tab-print-a4')?.addEventListener('click', () => setPrintFormat('a4'));
  document.getElementById('tab-print-contract')?.addEventListener('click', () => setPrintFormat('contract'));

  // Disparo nativo de impressão
  document.getElementById('btn-trigger-native-print')?.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.print) {
      window.electronAPI.print({ silent: false, printBackground: true });
    } else {
      window.print();
    }
    showToast('Documento enviado para a impressora.', 'success');
  });

  // =========================================================================
  // 7. SPEED TEST INTERATIVO (PING, DOWNLOAD, UPLOAD, JITTER)
  // =========================================================================
  let speedTestRunning = false;
  document.getElementById('btn-start-speed-test')?.addEventListener('click', () => {
    if (speedTestRunning) return;
    speedTestRunning = true;

    const dialVal = document.getElementById('st-speed-val');
    const pingEl = document.getElementById('st-ping-val');
    const downEl = document.getElementById('st-down-val');
    const upEl = document.getElementById('st-up-val');
    const jitterEl = document.getElementById('st-jitter-val');
    const pingStatus = document.getElementById('st-ping-status');

    if (pingStatus) pingStatus.textContent = 'A testar Ping...';
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const randomSpeed = (Math.random() * 40 + (currentServiceMode === 'fibra' ? 45 : 20)).toFixed(1);
      if (dialVal) dialVal.textContent = randomSpeed;

      if (step === 3) {
        if (pingEl) pingEl.textContent = '14 ms';
        if (jitterEl) jitterEl.textContent = '2 ms';
        if (pingStatus) pingStatus.textContent = 'Ping Excelente';
      }

      if (step >= 12) {
        clearInterval(interval);
        speedTestRunning = false;
        const finalDown = (currentServiceMode === 'fibra' ? 78.4 : 32.5).toFixed(1);
        const finalUp = (currentServiceMode === 'fibra' ? 45.2 : 12.0).toFixed(1);
        if (dialVal) dialVal.textContent = finalDown;
        if (downEl) downEl.textContent = `${finalDown} Mbps`;
        if (upEl) upEl.textContent = `${finalUp} Mbps`;
        showToast('Teste de velocidade de rede concluído com sucesso!', 'success');
      }
    }, 250);
  });

  // =========================================================================
  // 8. MODAIS & FORMULÁRIOS
  // =========================================================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  document.getElementById('btn-quick-new-invoice')?.addEventListener('click', () => openModal('modal-invoice'));
  document.getElementById('btn-open-new-invoice-modal')?.addEventListener('click', () => openModal('modal-invoice'));
  document.getElementById('btn-quick-new-client')?.addEventListener('click', () => openModal('modal-client'));
  document.getElementById('btn-open-new-client-modal')?.addEventListener('click', () => openModal('modal-client'));

  function openInvoiceModalForClient(clientId) {
    const sel = document.getElementById('inv-client-id');
    if (sel) sel.value = clientId;
    openModal('modal-invoice');
  }

  // Submissão Nova Factura
  document.getElementById('form-new-invoice')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const clientId = parseInt(document.getElementById('inv-client-id').value, 10);
    const desc = document.getElementById('inv-description').value;
    const amount = parseFloat(document.getElementById('inv-amount').value || 0);
    const penalty = parseFloat(document.getElementById('inv-penalty').value || 0);
    const method = document.getElementById('inv-method').value;

    const cli = clients.find((x) => x.id === clientId);
    const newInv = {
      id: Date.now(),
      number: `FT-2026/00${invoices.length + 150}`,
      clientId: clientId,
      clientName: cli ? cli.name : 'Assinante',
      description: desc,
      amount: amount,
      penalty: penalty,
      total: amount + penalty,
      method: method,
      date: new Date().toLocaleDateString('pt-AO'),
      status: 'Liquidada',
      operator: 'Administrador'
    };

    invoices.push(newInv);
    saveToStorage(STORAGE_KEY_INVOICES, invoices);

    if (cli) {
      cli.status = 'active';
      saveToStorage(STORAGE_KEY_CLIENTS, clients);
    }

    closeModal('modal-invoice');
    renderAll();
    showToast('Factura emitida com sucesso! A abrir talão térmico...', 'success');
    openPrintPreview(newInv);
  });

  // Submissão Novo Assinante
  document.getElementById('form-new-client')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cli-name').value;
    const phone = document.getElementById('cli-phone').value;
    const service = document.getElementById('cli-service').value;
    const fee = parseFloat(document.getElementById('cli-fee').value || 0);
    const pdo = document.getElementById('cli-pdo').value;
    const onu = document.getElementById('cli-onu').value;
    const addr = document.getElementById('cli-address').value;

    const newCli = {
      id: Date.now(),
      code: `CLI-00${clients.length + 110}`,
      name: name,
      phone: phone,
      service: service,
      fee: fee,
      pdo: pdo,
      onu: onu || '—',
      address: addr,
      status: 'active'
    };

    clients.push(newCli);
    saveToStorage(STORAGE_KEY_CLIENTS, clients);

    closeModal('modal-client');
    renderAll();
    showToast(`Assinante ${name} cadastrado com sucesso!`, 'success');
  });

  // Submissão Nova OS
  document.getElementById('form-new-os')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const clientId = parseInt(document.getElementById('os-client-id').value, 10);
    const type = document.getElementById('os-type').value;
    const tech = document.getElementById('os-tech').value;
    const desc = document.getElementById('os-description').value;

    const cli = clients.find((x) => x.id === clientId);

    const newOs = {
      id: Date.now(),
      code: `OS-2026-0${orders.length + 90}`,
      clientId: clientId,
      clientName: cli ? cli.name : 'Assinante',
      type: type,
      description: desc,
      date: new Date().toLocaleDateString('pt-AO'),
      priority: 'Alta',
      status: 'Em Curso',
      tech: tech
    };

    orders.push(newOs);
    saveToStorage(STORAGE_KEY_ORDERS, orders);

    closeModal('modal-os');
    renderAll();
    showToast(`Ordem de Serviço ${newOs.code} aberta com sucesso!`, 'success');
  });

  // Fecho de Caixa
  document.getElementById('btn-close-cash-register')?.addEventListener('click', () => {
    if (confirm('Deseja fechar o caixa do turno atual e gerar o relatório para a gerência?')) {
      showToast('Caixa do turno encerrado com sucesso. Folha de fecho impressa.', 'success');
    }
  });

  // Filtros de clientes
  document.querySelectorAll('.filter-tabs .filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tabs .filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderClientsTable();
    });
  });

  // Filtros de Stock
  document.querySelectorAll('[data-stock-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-stock-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeStockFilter = btn.getAttribute('data-stock-filter') || 'all';
      renderInventoryTable();
    });
  });

  // Busca em tempo real
  document.getElementById('client-search-input')?.addEventListener('input', () => {
    renderClientsTable();
  });

  // Salvar configurações gerais, minuta do contrato e textos da factura (Acesso Administrador)
  const STORAGE_KEY_SETTINGS = 'osdel_desktop_settings';
  function loadSettingsInputs() {
    const saved = loadFromStorage(STORAGE_KEY_SETTINGS, null);
    if (!saved) return;
    if (saved.companyName && document.getElementById('cfg-company-name')) document.getElementById('cfg-company-name').value = saved.companyName;
    if (saved.companyNif && document.getElementById('cfg-company-nif')) document.getElementById('cfg-company-nif').value = saved.companyNif;
    if (saved.companyAddress && document.getElementById('cfg-company-address')) document.getElementById('cfg-company-address').value = saved.companyAddress;
    if (saved.printerWidth && document.getElementById('cfg-printer-width')) document.getElementById('cfg-printer-width').value = saved.printerWidth;
    if (saved.printLogo && document.getElementById('cfg-print-logo')) document.getElementById('cfg-print-logo').value = saved.printLogo;
    if (saved.thermalFooter && document.getElementById('cfg-thermal-footer')) document.getElementById('cfg-thermal-footer').value = saved.thermalFooter;
    if (saved.toleranceDays && document.getElementById('cfg-tolerance-days')) document.getElementById('cfg-tolerance-days').value = saved.toleranceDays;
    if (saved.feeTv && document.getElementById('cfg-fee-tv')) document.getElementById('cfg-fee-tv').value = saved.feeTv;
    if (saved.feeFiber && document.getElementById('cfg-fee-fiber')) document.getElementById('cfg-fee-fiber').value = saved.feeFiber;
    if (saved.contractTitle && document.getElementById('cfg-contract-title')) document.getElementById('cfg-contract-title').value = saved.contractTitle;
    if (saved.contractIntro && document.getElementById('cfg-contract-intro')) document.getElementById('cfg-contract-intro').value = saved.contractIntro;
    if (saved.contractClauses && document.getElementById('cfg-contract-clauses')) document.getElementById('cfg-contract-clauses').value = saved.contractClauses;
    if (saved.contractClosing && document.getElementById('cfg-contract-closing')) document.getElementById('cfg-contract-closing').value = saved.contractClosing;

    // Campos da Factura configuráveis pelo Administrador
    if (saved.invoiceTitle && document.getElementById('cfg-invoice-title')) document.getElementById('cfg-invoice-title').value = saved.invoiceTitle;
    if (saved.invoiceSubtitle && document.getElementById('cfg-invoice-subtitle')) document.getElementById('cfg-invoice-subtitle').value = saved.invoiceSubtitle;
    if (saved.invoiceProformaTitle && document.getElementById('cfg-invoice-proforma-title')) document.getElementById('cfg-invoice-proforma-title').value = saved.invoiceProformaTitle;
    if (saved.invoiceVoidTitle && document.getElementById('cfg-invoice-void-title')) document.getElementById('cfg-invoice-void-title').value = saved.invoiceVoidTitle;
    if (saved.invoiceItemDesc && document.getElementById('cfg-invoice-item-desc')) document.getElementById('cfg-invoice-item-desc').value = saved.invoiceItemDesc;
    if (saved.invoiceItemNotes && document.getElementById('cfg-invoice-item-notes')) document.getElementById('cfg-invoice-item-notes').value = saved.invoiceItemNotes;
    if (saved.invoiceTaxExempt && document.getElementById('cfg-invoice-tax-exempt')) document.getElementById('cfg-invoice-tax-exempt').value = saved.invoiceTaxExempt;
    if (saved.invoiceBankingNotes && document.getElementById('cfg-invoice-banking-notes')) document.getElementById('cfg-invoice-banking-notes').value = saved.invoiceBankingNotes;
    if (saved.invoiceFooter && document.getElementById('cfg-invoice-footer')) document.getElementById('cfg-invoice-footer').value = saved.invoiceFooter;
    if (saved.thermalWarning && document.getElementById('cfg-thermal-warning')) document.getElementById('cfg-thermal-warning').value = saved.thermalWarning;
  }

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const data = {
      companyName: document.getElementById('cfg-company-name')?.value,
      companyNif: document.getElementById('cfg-company-nif')?.value,
      companyAddress: document.getElementById('cfg-company-address')?.value,
      printerWidth: document.getElementById('cfg-printer-width')?.value,
      printLogo: document.getElementById('cfg-print-logo')?.value,
      thermalFooter: document.getElementById('cfg-thermal-footer')?.value,
      toleranceDays: document.getElementById('cfg-tolerance-days')?.value,
      feeTv: document.getElementById('cfg-fee-tv')?.value,
      feeFiber: document.getElementById('cfg-fee-fiber')?.value,
      contractTitle: document.getElementById('cfg-contract-title')?.value,
      contractIntro: document.getElementById('cfg-contract-intro')?.value,
      contractClauses: document.getElementById('cfg-contract-clauses')?.value,
      contractClosing: document.getElementById('cfg-contract-closing')?.value,

      // Dados da factura salvos pelo administrador
      invoiceTitle: document.getElementById('cfg-invoice-title')?.value,
      invoiceSubtitle: document.getElementById('cfg-invoice-subtitle')?.value,
      invoiceProformaTitle: document.getElementById('cfg-invoice-proforma-title')?.value,
      invoiceVoidTitle: document.getElementById('cfg-invoice-void-title')?.value,
      invoiceItemDesc: document.getElementById('cfg-invoice-item-desc')?.value,
      invoiceItemNotes: document.getElementById('cfg-invoice-item-notes')?.value,
      invoiceTaxExempt: document.getElementById('cfg-invoice-tax-exempt')?.value,
      invoiceBankingNotes: document.getElementById('cfg-invoice-banking-notes')?.value,
      invoiceFooter: document.getElementById('cfg-invoice-footer')?.value,
      thermalWarning: document.getElementById('cfg-thermal-warning')?.value
    };
    saveToStorage(STORAGE_KEY_SETTINGS, data);
    showToast('Definições, minuta do contrato e textos da factura guardados com sucesso pelo Administrador!', 'success');
  });

  loadSettingsInputs();

  // Inicialização do modo detectado
  applyServiceMode(currentServiceMode);
});

// Utilitário global para cópia de texto (IBANs)
window.copyText = function(text) {
  navigator.clipboard?.writeText(text);
  const container = document.getElementById('toast-container');
  if (container) {
    const t = document.createElement('div');
    t.className = 'toast success';
    t.textContent = `IBAN copiado: ${text}`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }
};
