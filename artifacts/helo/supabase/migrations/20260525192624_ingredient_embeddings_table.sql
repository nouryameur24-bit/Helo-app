-- Migration : ingredient_embeddings_table
-- Appliquée via Supabase MCP le 2026-05-25 (task #112, Lot 19-D2)
-- Version: 20260525192624

-- Lot 19-D2 — pgvector embeddings ingrédients pour matching fuzzy OCR
-- Aujourd'hui : OCR 'aqva' (typo) → match exact échoue → fallback Claude (~2-5s, $0.001)
-- Demain : embedding similarity 'aqva' → 'aqua' en 50ms, $0 ongoing

-- Voyage AI voyage-3 (recommandé Anthropic) renvoie 1024 dims float32
-- OpenAI text-embedding-3-small renvoie 1536 dims float32
-- On part sur 1536 (compat OpenAI) + on stocke aussi un cheaper 768d optionnel

CREATE TABLE IF NOT EXISTS ingredient_embeddings (
  ingredient_id UUID PRIMARY KEY REFERENCES ingredients(id) ON DELETE CASCADE,
  embedding_text TEXT NOT NULL,           -- texte source qui a été embeddé (name + synonymes + INCI)
  embedding VECTOR(1536) NOT NULL,         -- OpenAI text-embedding-3-small
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index pour cosine similarity rapide (1M+ rows OK)
CREATE INDEX IF NOT EXISTS idx_ingredient_embeddings_hnsw
  ON ingredient_embeddings
  USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE ingredient_embeddings IS 'Lot 19-D2 — Embeddings ingrédients pour matching fuzzy (typos OCR). Populated via scripts/populate_embeddings.ts.';

-- RPC : trouve l'ingrédient le plus proche par cosine similarity
-- Returns ingredient_id + similarity score (1.0 = identical, 0.0 = orthogonal)
CREATE OR REPLACE FUNCTION match_ingredient_fuzzy(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5
) RETURNS TABLE(
  ingredient_id UUID,
  name TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.ingredient_id,
    i.name,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM ingredient_embeddings ie
  JOIN ingredients i ON i.id = ie.ingredient_id
  WHERE 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION match_ingredient_fuzzy IS 'Lot 19-D2 — Fuzzy match ingredient by embedding cosine similarity. Threshold 0.75 = match raisonnable, 0.85 = strict.';

-- Public read via RPC (security definer pas nécessaire — read-only)
GRANT EXECUTE ON FUNCTION match_ingredient_fuzzy(VECTOR, FLOAT, INT) TO anon, authenticated;

SELECT 'OK: ingredient_embeddings table + match_ingredient_fuzzy RPC' AS status;
