-- Migration : enable_pgvector_and_trgm
-- Appliquée via Supabase MCP le 2026-05-25 (task #112)
-- Version: 20260525192603

-- Enable pgvector (ingredient embeddings fuzzy matching) + pg_trgm (text similarity fallback)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'pg_trgm');
