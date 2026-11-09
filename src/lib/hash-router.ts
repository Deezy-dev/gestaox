import { useSyncExternalStore } from 'react';

// Assinantes globais sincronizados para mudanças de hash
let listeners: Array<() => void> = [];

const onHashChange = () => {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.error('[HashRouter] Erro ao executar listener:', err);
    }
  });
};

const subscribeToHashUpdates = (callback: () => void) => {
  if (listeners.push(callback) === 1) {
    window.addEventListener('hashchange', onHashChange);
  }
  return () => {
    listeners = listeners.filter((item) => item !== callback);
    if (!listeners.length) {
      window.removeEventListener('hashchange', onHashChange);
    }
  };
};

const hashPrefix = /^#?\/?/;

/**
 * Retorna o caminho atual limpo a partir do hash do navegador.
 * Ex: "#/clientes?status=late" -> "/clientes"
 * Ex: "" ou "#/" -> "/"
 */
export const currentHashLocation = (): string => {
  if (typeof window === 'undefined') return '/';
  const raw = window.location.hash.replace(hashPrefix, '');
  const [pathOnly] = raw.split('?');
  const clean = pathOnly ? pathOnly.trim() : '';
  if (!clean || clean === '') return '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
};

/**
 * Navega para uma nova rota hash disparando o evento hashchange
 * e notificando todos os componentes inscritos pelo useSyncExternalStore.
 */
export const navigateHash = (
  to: string,
  { state = null, replace = false }: { state?: any; replace?: boolean } = {}
) => {
  if (typeof window === 'undefined') return;
  const oldURL = window.location.href;
  const [pathPart, searchPart] = to.replace(hashPrefix, '').split('?');
  const targetPath = pathPart ? (pathPart.startsWith('/') ? pathPart : `/${pathPart}`) : '/';
  const targetHash = searchPart ? `#${targetPath}?${searchPart}` : `#${targetPath}`;

  const url = new URL(oldURL);
  url.hash = targetHash;
  const newURL = url.href;

  if (replace) {
    window.history.replaceState(state, '', newURL);
  } else {
    window.history.pushState(state, '', newURL);
  }

  // Notifica todos os listeners React imediatamente
  onHashChange();

  // Dispara o evento padrão para compatibilidade
  try {
    const event =
      typeof HashChangeEvent !== 'undefined'
        ? new HashChangeEvent('hashchange', { oldURL, newURL })
        : new Event('hashchange');
    window.dispatchEvent(event);
  } catch {
    window.dispatchEvent(new Event('hashchange'));
  }
};

/**
 * Hook oficial Wouter compatível com useSyncExternalStore para Electron e Web
 */
export const useCustomHashLocation = ({ ssrPath = '/' } = {}) => {
  const loc = useSyncExternalStore(
    subscribeToHashUpdates,
    currentHashLocation,
    () => ssrPath
  );
  return [loc, navigateHash] as [string, typeof navigateHash];
};

// Define a propriedade .hrefs que o Wouter Link utiliza para gerar href="#/caminho"
useCustomHashLocation.hrefs = (href: string) => {
  const clean = href.replace(hashPrefix, '');
  return '#' + (clean ? (clean.startsWith('/') ? clean : `/${clean}`) : '/');
};
