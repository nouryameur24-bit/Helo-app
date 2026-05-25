/**
 * src/embeddings/populate.ts
 *
 * Populate ingredient_embeddings via OpenAI text-embedding-3-small.
 *
 * Pourquoi : matcher fuzzy ingrédients OCR (typos type `aqva` → `aqua`) en 50ms
 * sans appeler Claude. Économise massivement les coûts AI sur le long terme.
 *
 * Coût : OpenAI text-embedding-3-small = $0.02 / 1M tokens
 *        5 313 ingrédients × ~50 tokens chacun = ~$0.005 one-shot
 *
 * Run :
 *   pnpm --filter @workspace/scripts run embeddings:populate [--force] [--max=100]
 *
 * Variables env :
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - OPENAI_API_KEY
 */
import { createClient } from '@supabase/supabase-js';

const OPENAI_API = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

interface Ingredient {
  id: string;
  name: string;
  name_inci: string | null;
  synonyms: string[] | null;
  category: string;
}

function buildEmbeddingText(ing: Ingredient): string {
  // Texte source pour embedding : name + INCI + synonymes (concaténés)
  // L'embedding capte la similarité sémantique → matche typos + variantes
  const parts = [ing.name];
  if (ing.name_inci && ing.name_inci !== ing.name) parts.push(ing.name_inci);
  if (ing.synonyms && ing.synonyms.length > 0) parts.push(ing.synonyms.join(', '));
  return parts.join(' | ');
}

async function callOpenAIEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      dimensions: DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
    usage: { total_tokens: number };
  };
  // Sort by index pour préserver l'ordre
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force'); // re-embed même si déjà présent
  const maxArg = args.find((a) => a.startsWith('--max='));
  const max = maxArg ? Number(maxArg.split('=')[1]) : undefined;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('Missing env: OPENAI_API_KEY (https://platform.openai.com/api-keys)');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('📂 Loading ingredients...');
  let query = client
    .from('ingredients')
    .select('id, name, name_inci, synonyms, category')
    .order('id');
  if (max) query = query.limit(max);

  // Si pas --force, exclure les ingrédients déjà embeddés
  let ingredients: Ingredient[];
  if (force) {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    ingredients = data as Ingredient[];
  } else {
    const { data: existing, error: existErr } = await client
      .from('ingredient_embeddings')
      .select('ingredient_id');
    if (existErr) throw new Error(existErr.message);
    const existingIds = new Set((existing ?? []).map((r) => r.ingredient_id));

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    ingredients = (data as Ingredient[]).filter((i) => !existingIds.has(i.id));
  }

  console.log(`   ${ingredients.length} ingrédients à embedder ${force ? '(force)' : '(skip déjà fait)'}`);

  if (ingredients.length === 0) {
    console.log('Rien à faire.');
    return;
  }

  // Batch OpenAI : max 2048 inputs par appel, on prend 100 pour rester safe
  const BATCH = 100;
  let totalDone = 0;
  let totalTokens = 0;
  const t0 = Date.now();

  for (let i = 0; i < ingredients.length; i += BATCH) {
    const chunk = ingredients.slice(i, i + BATCH);
    const texts = chunk.map(buildEmbeddingText);

    try {
      const embeddings = await callOpenAIEmbeddings(texts, openaiKey);
      // Approximation tokens (chaque text ~50 tokens) — pour reporting
      totalTokens += texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0);

      // Insert via Supabase
      const rows = chunk.map((ing, idx) => ({
        ingredient_id: ing.id,
        embedding_text: texts[idx],
        embedding: embeddings[idx],
        model: MODEL,
      }));

      const { error } = await client
        .from('ingredient_embeddings')
        .upsert(rows, { onConflict: 'ingredient_id' });

      if (error) {
        console.error(`Batch ${i} insert error: ${error.message}`);
        continue;
      }

      totalDone += chunk.length;
      const elapsed = (Date.now() - t0) / 1000;
      const rate = totalDone / elapsed;
      const eta = (ingredients.length - totalDone) / rate;
      console.log(
        `Progress: ${totalDone}/${ingredients.length} (${rate.toFixed(1)}/s, ETA ${Math.round(eta)}s)`,
      );
    } catch (err) {
      console.error(`Batch ${i} OpenAI error:`, (err as Error).message);
      // Pause sur erreur (peut-être rate limit)
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  const costUsd = (totalTokens / 1_000_000) * 0.02;
  console.log('\n✅ Embeddings populated');
  console.log(`   ${totalDone} ingrédients embeddés`);
  console.log(`   ~${totalTokens} tokens consommés`);
  console.log(`   Coût estimé : $${costUsd.toFixed(4)}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
