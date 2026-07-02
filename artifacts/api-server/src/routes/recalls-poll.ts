/**
 * routes/recalls-poll.ts — Lot 19-I1
 *
 * Endpoint cron qui :
 *   1. Fetch les rappels RappelConso (data.gouv.fr) via leur API publique
 *   2. Filtre les nouveaux (pas encore en DB)
 *   3. Insère dans product_recalls
 *   4. Pour chaque nouveau rappel, find les users qui ont scanné un produit
 *      avec un EAN matchant → push Expo notif
 *
 * Schedule : appelé toutes les heures par un cron externe (Replit Scheduled Jobs
 * ou GitHub Actions). Idempotent — rappel_id UNIQUE protège des doublons.
 *
 * Endpoint protégé par x-helo-cron-secret header (différent de x-helo-app-secret).
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';

import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { logger } from '../lib/logger.js';
import { secretsEqual } from '../middlewares/appSecret.js';

/**
 * Middleware : protège l'endpoint cron via x-helo-cron-secret header
 * (différent du x-helo-app-secret mobile pour cloisonnement).
 */
function cronSecretGate(req: Request, res: Response, next: NextFunction) {
  const provided = req.header('x-helo-cron-secret');
  const expected = process.env.HELO_CRON_SECRET;
  if (!expected) {
    logger.error('HELO_CRON_SECRET not set in env — recalls-poll disabled');
    res.status(503).json({ error: 'cron_not_configured' });
    return;
  }
  // Audit #3 : comparaison à temps constant (même durcissement que appSecret).
  if (!provided || !secretsEqual(provided, expected)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

const RAPPELCONSO_API =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso0/records';

// Limit du fetch RappelConso : 100 derniers rappels (largement suffisant pour 1h cron)
const FETCH_LIMIT = 100;
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface RappelConsoRecord {
  reference_fiche?: string;
  rappelguid?: string;
  liens_vers_les_images?: string;
  lien_vers_la_liste_des_produits?: string;
  noms_des_modeles_ou_references?: string;
  nom_de_la_marque_du_produit?: string;
  categorie_de_produit?: string;
  identification_des_produits?: string;
  conditionnements?: string;
  description_complementaire_du_risque?: string;
  motif_du_rappel?: string;
  risques_encourus_par_le_consommateur?: string;
  conduites_a_tenir_par_le_consommateur?: string;
  date_de_publication?: string;
  date_de_fin_de_la_procedure_de_rappel?: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, unknown>;
  priority?: 'default' | 'high';
}

function extractEans(rec: RappelConsoRecord): string[] {
  const identif = rec.identification_des_produits ?? '';
  // Audit final fix : l'ancien filtre `length===8||12||13` DROPPAIT les codes à
  // 9/10/11 chiffres ET ratait les GTIN-14 (EAN13 à zéro de tête) + les codes
  // collés à des lettres (`lot4006381333931`). Pour une feature safety (rappel
  // sanitaire), un faux négatif = produit rappelé jamais notifié à la maman.
  // On capture désormais toute séquence de 8 à 14 chiffres (frontières non-digit
  // au lieu de \b, pour attraper "lot:3017620422003"), puis on normalise.
  const raw = identif.match(/(?<!\d)\d{8,14}(?!\d)/g) ?? [];
  const eans = new Set<string>();
  for (const code of raw) {
    eans.add(code);
    // GTIN-14 → EAN13 (retire le zéro de tête) pour matcher products.barcode.
    if (code.length === 14 && code.startsWith('0')) eans.add(code.slice(1));
    // EAN13 à zéro de tête → UPC-12 (et inversement) pour maximiser le matching.
    if (code.length === 13 && code.startsWith('0')) eans.add(code.slice(1));
  }
  return [...eans];
}

function severityFromRisque(risque: string): 'low' | 'medium' | 'high' | 'critical' {
  const r = (risque ?? '').toLowerCase();
  if (r.includes('listeria') || r.includes('botulis') || r.includes('mortel')) return 'critical';
  if (r.includes('salmonell') || r.includes('e. coli') || r.includes('allerg')) return 'high';
  if (r.includes('contamination') || r.includes('chimique')) return 'medium';
  return 'low';
}

async function fetchRecentRecalls(): Promise<RappelConsoRecord[]> {
  const params = new URLSearchParams({
    limit: String(FETCH_LIMIT),
    order_by: 'date_de_publication DESC',
  });
  const url = `${RAPPELCONSO_API}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`RappelConso ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as { results: RappelConsoRecord[] };
  return data.results ?? [];
}

async function sendExpoBatch(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  // Expo accepte max 100 messages par requête
  const CHUNK = 100;
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    } catch (err) {
      logger.warn({ err, chunk_size: chunk.length }, 'expo_push_batch_failed');
    }
  }
}

async function recallsPollHandler(_req: Request, res: Response) {
  const t0 = Date.now();

  try {
    logger.info('recalls_poll.start');

    // 1. Fetch RappelConso
    const records = await fetchRecentRecalls();
    logger.info({ count: records.length }, 'recalls_poll.fetched');

    // 2. Filter nouveaux (pas déjà en DB)
    const rappelIds = records
      .map((r) => r.reference_fiche ?? r.rappelguid ?? '')
      .filter((id) => id.length > 0);

    const { data: existing } = await supabaseAdmin
      .from('product_recalls')
      .select('rappel_id')
      .in('rappel_id', rappelIds);

    const existingIds = new Set((existing ?? []).map((r) => r.rappel_id));
    const newRecords = records.filter((r) => {
      const id = r.reference_fiche ?? r.rappelguid ?? '';
      return id.length > 0 && !existingIds.has(id);
    });

    logger.info({ new_count: newRecords.length }, 'recalls_poll.filtered_new');

    if (newRecords.length === 0) {
      res.json({ status: 'no_new_recalls', duration_ms: Date.now() - t0 });
      return;
    }

    // 3. Insert nouveaux rappels
    const rows = newRecords.map((rec) => {
      const eans = extractEans(rec);
      return {
        rappel_id: rec.reference_fiche ?? rec.rappelguid!,
        rappel_url: rec.lien_vers_la_liste_des_produits ?? null,
        product_name: rec.noms_des_modeles_ou_references ?? 'Produit rappelé',
        brand: rec.nom_de_la_marque_du_produit ?? null,
        category: (rec.categorie_de_produit ?? '').toLowerCase().includes('alim')
          ? 'food'
          : (rec.categorie_de_produit ?? '').toLowerCase().includes('cosm')
          ? 'cosmetic'
          : 'other',
        ean_codes: eans,
        lot_codes: [],
        risk_description: rec.risques_encourus_par_le_consommateur ?? rec.motif_du_rappel ?? '',
        risk_severity: severityFromRisque(rec.risques_encourus_par_le_consommateur ?? ''),
        action_required: rec.conduites_a_tenir_par_le_consommateur ?? 'Voir la fiche officielle',
        recall_date: rec.date_de_publication?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        end_date: rec.date_de_fin_de_la_procedure_de_rappel?.slice(0, 10) ?? null,
      };
    });

    // Audit final fix : upsert avec onConflict au lieu d'insert sec. Deux crons
    // concurrents (ou un retry) sur le même rappel_id levaient une violation
    // unique → throw → batch entier perdu, 0 push. ignoreDuplicates = idempotent.
    const { error: insertError, data: inserted } = await supabaseAdmin
      .from('product_recalls')
      .upsert(rows, { onConflict: 'rappel_id', ignoreDuplicates: true })
      .select('id, rappel_id, product_name, brand, ean_codes, risk_severity, action_required');

    if (insertError) {
      throw new Error(`insert_recalls: ${insertError.message}`);
    }

    // 4. Pour chaque nouveau rappel, push aux users qui ont scanné un EAN matchant
    let totalUsersNotified = 0;
    let totalRecallsWithMatch = 0;
    const recallsToMarkPushed: string[] = [];

    for (const recall of inserted ?? []) {
      if (!recall.ean_codes || recall.ean_codes.length === 0) {
        recallsToMarkPushed.push(recall.id);
        continue;
      }

      const { data: users, error: userError } = await supabaseAdmin.rpc(
        'find_users_to_notify_recall',
        { p_ean_codes: recall.ean_codes },
      );

      if (userError) {
        logger.warn({ err: userError, recall_id: recall.id }, 'find_users_failed');
        continue;
      }

      if (!users || users.length === 0) {
        recallsToMarkPushed.push(recall.id);
        continue;
      }

      totalRecallsWithMatch++;
      totalUsersNotified += users.length;

      const messages: ExpoPushMessage[] = users.map((u: { expo_push_token: string }) => ({
        to: u.expo_push_token,
        title: '⚠️ Rappel produit Hēlo',
        body: `${recall.product_name}${recall.brand ? ` (${recall.brand})` : ''} — ${recall.action_required.slice(0, 100)}`,
        sound: 'default',
        priority: recall.risk_severity === 'critical' || recall.risk_severity === 'high' ? 'high' : 'default',
        data: {
          type: 'recall',
          recall_id: recall.id,
          product_name: recall.product_name,
          severity: recall.risk_severity,
        },
      }));

      await sendExpoBatch(messages);
      recallsToMarkPushed.push(recall.id);
    }

    // 5. Mark pushed
    if (recallsToMarkPushed.length > 0) {
      await supabaseAdmin
        .from('product_recalls')
        .update({ pushed_at: new Date().toISOString() })
        .in('id', recallsToMarkPushed);
    }

    res.json({
      status: 'ok',
      duration_ms: Date.now() - t0,
      new_recalls_count: newRecords.length,
      recalls_with_user_match: totalRecallsWithMatch,
      total_users_notified: totalUsersNotified,
    });
  } catch (err) {
    logger.error({ err }, 'recalls_poll.failed');
    res.status(500).json({
      status: 'error',
      error: (err as Error).message,
      duration_ms: Date.now() - t0,
    });
  }
}

const router: IRouter = Router();
router.post('/recalls/poll', cronSecretGate, recallsPollHandler);
export default router;
