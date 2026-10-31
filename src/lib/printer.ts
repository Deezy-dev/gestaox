/**
 * Universal Printing Utility for OSDEL Gestão
 * Handles:
 * 1. Safe print invocation with body styling tags
 * 2. Detection of iframe sandbox constraints
 * 3. Opening clean printable views in a new browser tab (bypassing any iframe limits)
 */

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export interface PrintOptions {
  title?: string;
  elementId?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Triggers native print with appropriate body classes and cleanup.
 */
export function triggerPrint(options: PrintOptions = {}): boolean {
  try {
    if (options.onBeforePrint) {
      options.onBeforePrint();
    }

    // Add printing classes so media query styles know how to isolate content
    if (options.elementId) {
      document.body.classList.add('printing-modal');
    }

    window.focus();
    window.print();

    // Clean up classes after a brief delay
    setTimeout(() => {
      document.body.classList.remove('printing-modal');
      if (options.onAfterPrint) {
        options.onAfterPrint();
      }
    }, 1500);

    return true;
  } catch (err) {
    console.error('Falha ao acionar window.print():', err);
    document.body.classList.remove('printing-modal');
    return false;
  }
}

/**
 * Builds a direct standalone printable URL
 */
export function getPrintUrl(tipo: string, params: Record<string, string | number> = {}): string {
  const query = new URLSearchParams();
  query.set('tipo', tipo);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      query.set(key, String(val));
    }
  }
  return `/imprimir?${query.toString()}`;
}

/**
 * Opens a dedicated print tab in a new browser window/tab
 */
export function openPrintTab(tipo: string, params: Record<string, string | number> = {}) {
  const url = getPrintUrl(tipo, params);
  window.open(url, '_blank', 'noopener,noreferrer');
}
