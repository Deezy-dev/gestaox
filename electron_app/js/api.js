/**
 * GESTÃO X · SERVIÇO CENTRALIZADO DE API (FETCH + JWT)
 * Suporte completo a PythonAnywhere Free e Servidor Local
 */

class ApiService {
  constructor() {
    this.DEFAULT_URL = 'https://osdelltecnologia.pythonanywhere.com';
    this.baseUrl = this.getStoredBaseUrl();
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  getStoredBaseUrl() {
    return localStorage.getItem('osdel_api_base_url') || localStorage.getItem('gestaox_api_url') || this.DEFAULT_URL;
  }

  setBaseUrl(url) {
    if (!url) url = this.DEFAULT_URL;
    let clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem('gestaox_api_url', clean);
    this.baseUrl = clean;
  }

  getAccessToken() {
    return localStorage.getItem('gestaox_access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('gestaox_refresh_token');
  }

  getCurrentUser() {
    try {
      const data = localStorage.getItem('gestaox_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  saveAuth(data) {
    if (data.access_token) localStorage.setItem('gestaox_access_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('gestaox_refresh_token', data.refresh_token);
    if (data.user) localStorage.setItem('gestaox_user', JSON.stringify(data.user));
  }

  clearAuth() {
    localStorage.removeItem('gestaox_access_token');
    localStorage.removeItem('gestaox_refresh_token');
    localStorage.removeItem('gestaox_user');
  }

  isAuthenticated() {
    return Boolean(this.getAccessToken());
  }

  /**
   * Executa requisição com tratamento de rede, timeout e renovação automática de JWT
   */
  async request(endpoint, options = {}, retrying = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Tratamento especial para Token JWT expirado (401)
      if (response.status === 401 && !retrying && this.getRefreshToken()) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request(endpoint, options, true); // Retenta a requisição com novo token
        } else {
          this.clearAuth();
          window.dispatchEvent(new CustomEvent('auth:expired'));
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      }

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMsg = data.message || `Erro ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      // Se for uma requisição GET com sucesso, armazena no cache local para operação offline
      if ((!options.method || options.method === 'GET') && data && data.success) {
        this.cacheResponse(endpoint, data);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      // Se a conexão falhou e temos cache para GET, retorna o cache local
      if ((!options.method || options.method === 'GET')) {
        const cached = this.getCachedResponse(endpoint);
        if (cached) {
          console.warn(`[API] Modo offline ativado para endpoint: ${endpoint}`);
          return { ...cached, _isOfflineCache: true };
        }
      }

      if (err.name === 'AbortError') {
        throw new Error('Tempo de conexão esgotado (Timeout). Verifique se o servidor está ativo.');
      }
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error(`Não foi possível conectar ao servidor (${this.baseUrl}). Verifique a URL e a internet.`);
      }
      throw err;
    }
  }

  // Cache offline simples e resiliente em localStorage
  cacheResponse(endpoint, data) {
    try {
      localStorage.setItem(`cache_${endpoint}`, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Erro ao salvar cache:', e);
    }
  }

  getCachedResponse(endpoint) {
    try {
      const raw = localStorage.getItem(`cache_${endpoint}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Renova token JWT de forma transparente
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      });

      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.access_token) {
        localStorage.setItem('gestaox_access_token', data.access_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Verificação de saúde da API
   */
  async checkHealth() {
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/health`, { method: 'GET', cache: 'no-store' });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        return { online: true, latency, baseUrl: this.baseUrl };
      }
      return { online: false, latency, error: `Status ${res.status}` };
    } catch (err) {
      return { online: false, latency: 0, error: err.message };
    }
  }

  // ==========================================
  // ENDPOINTS DE AUTENTICAÇÃO
  // ==========================================
  async login(username, password) {
    const res = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuth: true
    });
    if (res.success) {
      this.saveAuth(res);
    }
    return res;
  }

  logout() {
    this.clearAuth();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  async getMe() {
    return this.request('/api/v1/auth/me');
  }

  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboard() {
    return this.request('/api/v1/dashboard/summary');
  }

  // ==========================================
  // CLIENTES
  // ==========================================
  async getClients(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'todos') query.set('status', params.status);
    if (params.service_type && params.service_type !== 'todos') query.set('service_type', params.service_type);
    if (params.page) query.set('page', params.page);
    if (params.per_page) query.set('per_page', params.per_page);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/v1/clients${qs}`);
  }

  async getClient(id) {
    return this.request(`/api/v1/clients/${id}`);
  }

  async createClient(clientData) {
    return this.request('/api/v1/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }

  async updateClient(id, clientData) {
    return this.request(`/api/v1/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  }

  async deleteClient(id) {
    return this.request(`/api/v1/clients/${id}`, {
      method: 'DELETE'
    });
  }

  // ==========================================
  // ORÇAMENTOS
  // ==========================================
  async getBudgets(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'todos') query.set('status', params.status);
    if (params.client_id) query.set('client_id', params.client_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/v1/budgets${qs}`);
  }

  async createBudget(data) {
    return this.request('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateBudgetStatus(id, status) {
    return this.request(`/api/v1/budgets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ==========================================
  // FATURAS
  // ==========================================
  async getInvoices(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'todos') query.set('status', params.status);
    if (params.client_id) query.set('client_id', params.client_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/v1/invoices${qs}`);
  }

  async createInvoice(data) {
    return this.request('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async payInvoice(id, paymentData = {}) {
    return this.request(`/api/v1/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // ==========================================
  // USUÁRIOS
  // ==========================================
  async getUsers() {
    return this.request('/api/v1/users');
  }

  async createUser(data) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Exporta instância global
window.api = new ApiService();
