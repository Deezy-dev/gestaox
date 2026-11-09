/**
 * OSDEL TECNOLOGIA - GESTOR CENTRAL DE LOGOTIPO DA EMPRESA
 * Permite actualizar o logotipo em tempo real por upload ou URL,
 * reflectindo instantaneamente no cabeçalho, sidebar e em todos os documentos/PDFs.
 */

import { OSDEL_LOGO_BASE64 } from './osdel-logo-base64';

const LOGO_STORAGE_KEY = 'osdel_company_logo';
export const DEFAULT_LOGO_URL = OSDEL_LOGO_BASE64;

export function getCompanyLogo(customUrl?: string): string {
  // If customUrl is provided and is a base64 data URI, use it
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
    const trimmed = customUrl.trim();
    // If it's a data URI or external http/https, verify protocol
    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }
    // In Electron (file:// protocol or window.electronAPI) relative URLs without data: break; fallback to base64
    const isFileOrElectron =
      (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window as any).electronAPI)) ||
      false;

    if (
      trimmed === '/osdel-logo.jpg' ||
      trimmed === 'osdel-logo.jpg' ||
      trimmed === '/logo.png.jpg' ||
      trimmed === 'logo.png.jpg' ||
      trimmed.startsWith('/assets/') ||
      trimmed.startsWith('assets/') ||
      isFileOrElectron
    ) {
      return OSDEL_LOGO_BASE64;
    }
    return trimmed;
  }

  if (typeof window === 'undefined') return DEFAULT_LOGO_URL;

  try {
    const custom = localStorage.getItem(LOGO_STORAGE_KEY);
    if (custom && custom.trim().length > 0) {
      const trimmed = custom.trim();
      if (
        trimmed === '/osdel-logo.jpg' ||
        trimmed === 'osdel-logo.jpg' ||
        trimmed === '/logo.png.jpg' ||
        trimmed === 'logo.png.jpg' ||
        (window.location.protocol === 'file:' && !trimmed.startsWith('data:'))
      ) {
        return OSDEL_LOGO_BASE64;
      }
      return trimmed;
    }
    return DEFAULT_LOGO_URL;
  } catch {
    return DEFAULT_LOGO_URL;
  }
}

export function setCompanyLogo(logoDataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, logoDataUrl);
    window.dispatchEvent(new CustomEvent('osdel-logo-updated', { detail: { logoUrl: logoDataUrl } }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('osdel_sync_channel');
      bc.postMessage({ type: 'LOGO_UPDATED', logoUrl: logoDataUrl });
      bc.close();
    }
  } catch (err) {
    console.error('Erro ao guardar logotipo:', err);
  }
}

export const saveCompanyLogo = setCompanyLogo;

export function resetCompanyLogo(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('osdel-logo-updated', { detail: { logoUrl: DEFAULT_LOGO_URL } }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('osdel_sync_channel');
      bc.postMessage({ type: 'LOGO_UPDATED', logoUrl: DEFAULT_LOGO_URL });
      bc.close();
    }
  } catch (err) {
    console.error('Erro ao repor logotipo padrão:', err);
  }
}
