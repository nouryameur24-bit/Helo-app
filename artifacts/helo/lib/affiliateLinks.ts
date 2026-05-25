/**
 * lib/affiliateLinks.ts — Lot 19-G1
 *
 * Wrapper pour les liens marchands affiliate-ready côté mobile.
 *
 * Schema product.purchase_links côté backend :
 *   {
 *     "amazon": "https://amazon.fr/dp/BXXXXXX",
 *     "monoprix": "https://courses.monoprix.fr/p/...",
 *     "bebe9": "https://www.bebe9.com/...",
 *     "pharma_express": "https://...",
 *   }
 *
 * Le backend api-server complète les query strings affiliate :
 *   - Amazon : ?tag=helo-fr-21
 *   - Monoprix : ?utm_source=helo
 *   - etc.
 *
 * Track les clicks via Supabase pour mesurer conversion (table affiliate_clicks).
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { swallow } from '@/lib/swallow';
import { track } from '@/lib/analytics';
import { logError } from '@/lib/logger';

export type Merchant = 'amazon' | 'monoprix' | 'bebe9' | 'pharma_express';

export interface PurchaseLinks {
  amazon?: string;
  monoprix?: string;
  bebe9?: string;
  pharma_express?: string;
}

const MERCHANT_LABELS: Record<Merchant, string> = {
  amazon: 'Amazon',
  monoprix: 'Monoprix Drive',
  bebe9: 'Bébé9',
  pharma_express: 'Pharma Express',
};

const MERCHANT_LOGOS: Record<Merchant, string> = {
  amazon: '🅰️',
  monoprix: '🛒',
  bebe9: '👶',
  pharma_express: '💊',
};

export function merchantLabel(m: Merchant): string {
  return MERCHANT_LABELS[m] ?? m;
}

export function merchantEmoji(m: Merchant): string {
  return MERCHANT_LOGOS[m] ?? '🛍️';
}

/**
 * Order préférentiel d'affichage : Monoprix Drive > Bébé9 > Pharma Express > Amazon.
 * Drive = pas de frais de port + livraison rapide = meilleur UX pour mama enceinte.
 * Amazon en dernier (commission moindre + pas spécifique grossesse).
 */
const DISPLAY_ORDER: Merchant[] = ['monoprix', 'bebe9', 'pharma_express', 'amazon'];

export function getAvailableMerchants(links: PurchaseLinks | undefined): Merchant[] {
  if (!links) return [];
  return DISPLAY_ORDER.filter((m) => Boolean(links[m]));
}

/**
 * Ouvre le lien marchand en in-app browser (SafariViewController iOS / Chrome Custom Tab Android).
 * Track le click pour analytics + DB.
 */
export async function openMerchantLink(params: {
  merchant: Merchant;
  url: string;
  productId?: string | null;
  sourceProductId?: string | null;
  userId?: string | null;
  context?: 'alternative_card' | 'product_detail' | 'recall_replacement';
}): Promise<boolean> {
  const { merchant, url, productId, sourceProductId, userId, context } = params;

  // Track analytics
  track('alternative_swap_tapped', {
    merchant,
    product_id: productId ?? null,
    source_product_id: sourceProductId ?? null,
    context: context ?? 'unknown',
  }).catch(swallow);

  // DB tracking (fire-and-forget, non bloquant)
  if (isSupabaseConfigured) {
    supabase
      .from('affiliate_clicks')
      .insert({
        user_id: userId ?? null,
        product_id: productId ?? null,
        source_product_id: sourceProductId ?? null,
        merchant,
        url,
        context: context ?? null,
      })
      .then(({ error }) => {
        if (error) logError('affiliateLinks.trackClick', new Error(error.message));
      });
  }

  // Ouvre l'URL (in-app browser de préférence)
  try {
    const canOpenInBrowser = await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: '#E66B6B',
    });
    return canOpenInBrowser.type === 'opened' || canOpenInBrowser.type === 'cancel';
  } catch (err) {
    // Fallback : Linking natif
    logError('affiliateLinks.openWebBrowser', err);
    try {
      await Linking.openURL(url);
      return true;
    } catch (linkErr) {
      logError('affiliateLinks.openURL', linkErr);
      return false;
    }
  }
}
