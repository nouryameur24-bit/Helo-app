/**
 * scrapers/_shared/types.ts
 *
 * Schema commun de tous les scrapers. Chaque scraper produit un `ScrapedProduct`
 * normalisé qui est inséré dans `products` via supabase_writer.
 */

export interface ScrapedProduct {
  /** EAN/UPC. Notre clé canonique pour la dedup. */
  barcode: string;
  /** Nom commercial complet. */
  name: string;
  /** Marque (Avène, La Roche-Posay, etc.). */
  brand: string;
  /**
   * Catégorie générale Hēlo.
   * - cosmetic : crèmes, lotions, parfums, hygiène
   * - food : alimentaire
   * - medication : médicaments OTC, compléments
   */
  category: 'cosmetic' | 'food' | 'medication';
  /**
   * Liste INCI brute, telle qu'affichée sur la fiche produit.
   * Le matcher Hēlo se charge du parsing/normalization.
   */
  ingredients_raw: string;
  /** URL image officielle du produit (jamais re-hébergée chez nous). */
  image_url: string | null;
  /** Description courte FR (optionnel). */
  description_fr: string | null;
  /** URL canonique de la fiche scrapée (pour traçabilité). */
  source_url: string;
  /**
   * Identifiant interne du scraper (= clé `products.source` côté DB).
   * Convention : 'scraped_<sitename>' ex: 'scraped_doctipharma'.
   */
  source: string;
  /**
   * Sous-usage (intended_use, Lot 19-E1b). Si le scraper peut deviner,
   * l'inférer ici, sinon laisser null — le matcher cross-table le fera.
   */
  intended_use: string | null;
  /**
   * Score qualité de la source (Lot 19-E1c). Échelle 0-100.
   *  - 100 : helo curated par main
   *  - 90  : marque officielle (avene.fr)
   *  - 80  : pharmacie (doctipharma, newpharma)
   *  - 70  : drive supermarché
   *  - 60  : OBF (open beauty facts)
   *  - 50  : OFF (open food facts longue traîne)
   */
  quality_score: number;
  /** Metadata libre (lot, contenance, prix, etc.). */
  metadata: Record<string, unknown>;
}

export interface ScraperRunStats {
  scraper: string;
  pages_visited: number;
  products_extracted: number;
  products_inserted: number;
  products_skipped_dedup: number;
  errors: number;
  duration_ms: number;
  estimated_cost_usd: number;
}

export interface ScrapeContext {
  /** Service role key required pour bypass RLS sur INSERT products. */
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
  /** Anthropic API key pour Claude-assisted extraction. */
  anthropicKey: string;
  /** Rate limit (req/sec) global. Défaut 1.5. */
  rateLimitPerSec?: number;
  /** Mode dry-run : extrait + log mais n'insère pas. */
  dryRun?: boolean;
  /** Limite max de produits par run (pour tests). */
  maxProducts?: number;
}
