-- ─── Lot 17-04 + 17-05 — Dosage médicaments + Plantes médicinales CRAT ─────────
--
-- À EXÉCUTER UNE SEULE FOIS dans l'éditeur SQL Supabase.
--
-- Contenu :
--   1. Ajout des colonnes `max_dose_mg_per_day`, `dose_unit`, `dose_note`
--      à la table `ingredients` (Lot 17-04)
--   2. UPDATE des médicaments OTC populaires avec leurs limites de dose
--      (paracétamol, ibuprofène, etc.)
--   3. INSERT de 50 plantes médicinales et infusions documentées CRAT
--      (curcuma, gingembre, ortie, etc.) avec risk_level par trimestre
--
-- Idempotent : safe à re-run, ne duplique pas les insertions (ON CONFLICT DO NOTHING).

BEGIN;

-- ─── PARTIE 1 — Schéma : champ dose ─────────────────────────────────────────
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS max_dose_mg_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS dose_unit TEXT,
  ADD COLUMN IF NOT EXISTS dose_note TEXT;

COMMENT ON COLUMN ingredients.max_dose_mg_per_day IS
  'Lot 17-04 : dose journalière maximale recommandée pendant grossesse (CRAT/ANSM). NULL si non applicable (cosmétiques, additifs alimentaires).';

COMMENT ON COLUMN ingredients.dose_unit IS
  'Unité affichée à l''utilisatrice. Ex: "mg", "g", "ml", "tasses". NULL si max_dose_mg_per_day est NULL.';

COMMENT ON COLUMN ingredients.dose_note IS
  'Note explicative courte (1 phrase) sur la posologie. Ex: "Au-delà : hépatotoxicité fœtale possible".';

-- ─── PARTIE 2 — Dosage médicaments OTC populaires ──────────────────────────
-- Sources : CRAT (lecrat.fr), ANSM, Vidal. Doses recommandées femme enceinte.

UPDATE ingredients SET
  max_dose_mg_per_day = 3000,
  dose_unit = 'mg',
  dose_note = 'Maximum 3 g par jour. Au-delà : risque d''hépatotoxicité maternelle et fœtale.'
WHERE LOWER(name) LIKE '%paracétamol%' OR LOWER(name_inci) LIKE '%paracetamol%' OR LOWER(name) LIKE '%acetaminophen%';

UPDATE ingredients SET
  max_dose_mg_per_day = 1200,
  dose_unit = 'mg',
  dose_note = 'Contre-indiqué à partir du 6ème mois (24SA). Avant : 1200 mg/jour max sur prescription uniquement.'
WHERE LOWER(name) LIKE '%ibuprofène%' OR LOWER(name) LIKE '%ibuprofen%' OR LOWER(name_inci) LIKE '%ibuprofen%';

UPDATE ingredients SET
  max_dose_mg_per_day = 240,
  dose_unit = 'mg',
  dose_note = 'Spasfon : 2 comprimés (160 mg) jusqu''à 3 fois par jour max. Safe en grossesse selon CRAT.'
WHERE LOWER(name) LIKE '%phloroglucinol%';

UPDATE ingredients SET
  max_dose_mg_per_day = 200,
  dose_unit = 'mg',
  dose_note = 'Caféine : limiter à 200 mg/jour (~2 tasses de café). Au-delà : risque de retard de croissance.'
WHERE LOWER(name) LIKE '%caféine%' OR LOWER(name_inci) LIKE '%caffeine%';

UPDATE ingredients SET
  max_dose_mg_per_day = 50,
  dose_unit = 'mg',
  dose_note = 'Vitamine B6 (pyridoxine) : utile contre les nausées. Max 50 mg/jour sans avis médical.'
WHERE LOWER(name) LIKE '%pyridoxine%' OR LOWER(name_inci) LIKE '%vitamin b6%';

UPDATE ingredients SET
  max_dose_mg_per_day = 4000,
  dose_unit = 'UI',
  dose_note = 'Vitamine D : 4000 UI/jour max (CRAT). Supplémentation recommandée en grossesse.'
WHERE LOWER(name) LIKE '%cholécalciférol%' OR LOWER(name) LIKE '%vitamin d3%';

UPDATE ingredients SET
  max_dose_mg_per_day = 3000,
  dose_unit = 'UI',
  dose_note = 'Vitamine A : risque tératogène au-delà de 3000 UI/jour (10 000 UI = malformations).'
WHERE LOWER(name) LIKE '%rétinol%' OR LOWER(name_inci) LIKE '%retinol%';

-- ─── PARTIE 3 — Seed plantes médicinales CRAT (50 entrées) ──────────────────
-- Sources : lecrat.fr, ANSES, Phytothérapie clinique (Goetz et Ghédira).
-- ON CONFLICT DO NOTHING pour idempotence (re-run safe).

INSERT INTO ingredients (name, name_inci, synonyms, category, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description_fr, source, source_url) VALUES

-- Plantes utérotoniques (DANGER tout trimestre)
('Curcuma', 'curcuma longa', ARRAY['curcumin', 'turmeric', 'safran d''inde'], 'food', 'caution', 'caution', 'safe', 'safe', 'À doses culinaires (épice) : safe. À doses thérapeutiques (>500mg/j extrait) : utérotonique, à éviter T1-T2.', 'CRAT', 'https://lecrat.fr/spip.php?page=article&id_article=696'),
('Réglisse', 'glycyrrhiza glabra', ARRAY['licorice', 'liquorice'], 'food', 'danger', 'danger', 'danger', 'caution', 'Hypertension maternelle, accouchement prématuré documenté. Éviter pendant toute la grossesse.', 'CRAT', 'https://lecrat.fr/'),
('Sauge officinale', 'salvia officinalis', ARRAY['sage'], 'food', 'danger', 'danger', 'danger', 'danger', 'Effet abortif (thuyone). Diminue la lactation. Contre-indiqué grossesse + allaitement.', 'CRAT', 'https://lecrat.fr/'),
('Armoise', 'artemisia vulgaris', ARRAY['mugwort'], 'food', 'danger', 'danger', 'danger', 'caution', 'Effet emménagogue et abortif. Contre-indiqué pendant grossesse.', 'ANSES', NULL),
('Tanaisie', 'tanacetum vulgare', ARRAY['tansy'], 'food', 'danger', 'danger', 'danger', 'danger', 'Toxicité hépatique + effet abortif. Contre-indiqué pendant grossesse et allaitement.', 'ANSES', NULL),
('Rue', 'ruta graveolens', ARRAY['common rue'], 'food', 'danger', 'danger', 'danger', 'danger', 'Effet abortif puissant documenté. Contre-indiqué.', 'ANSES', NULL),
('Aloès', 'aloe vera', ARRAY['aloe ferox', 'aloe latex'], 'food', 'danger', 'danger', 'danger', 'caution', 'Latex d''aloès (boisson) : laxatif stimulant + utérotonique. Gel topique cosmétique : safe.', 'CRAT', NULL),
('Bourrache', 'borago officinalis', ARRAY['borage'], 'food', 'danger', 'danger', 'danger', 'caution', 'Alcaloïdes pyrrolizidiniques hépatotoxiques. Huile cosmétique tolérée.', 'CRAT', NULL),
('Boldo', 'peumus boldus', ARRAY['boldo leaves'], 'food', 'danger', 'danger', 'danger', 'caution', 'Effet abortif + hépatotoxique. Contre-indiqué pendant grossesse.', 'ANSES', NULL),
('Ginseng', 'panax ginseng', ARRAY['panax'], 'food', 'caution', 'caution', 'caution', 'caution', 'Effets oestrogéniques mal documentés en grossesse. À éviter par précaution.', 'ANSES', NULL),

-- Plantes contre nausées (SAFE/CAUTION T1)
('Gingembre', 'zingiber officinale', ARRAY['ginger'], 'food', 'safe', 'safe', 'safe', 'safe', 'Efficace contre nausées T1 jusqu''à 1g/jour. Au-delà : effet anticoagulant possible.', 'CRAT', 'https://lecrat.fr/spip.php?page=article&id_article=585'),
('Citron', 'citrus limon', ARRAY['lemon'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse. Infusion ou jus.', 'CRAT', NULL),
('Menthe poivrée', 'mentha piperita', ARRAY['peppermint'], 'food', 'caution', 'safe', 'safe', 'caution', 'Infusion : safe en T2-T3. Huile essentielle : éviter T1 et allaitement (diminue lactation).', 'CRAT', NULL),
('Camomille matricaire', 'matricaria chamomilla', ARRAY['chamomile', 'camomille allemande'], 'food', 'safe', 'safe', 'safe', 'safe', 'Infusion safe en grossesse à doses raisonnables (3 tasses/jour max). Apaisante.', 'CRAT', NULL),
('Tilleul', 'tilia cordata', ARRAY['linden'], 'food', 'safe', 'safe', 'safe', 'safe', 'Infusion safe en grossesse. Apaisante, sommeil.', 'CRAT', NULL),
('Verveine', 'aloysia citrodora', ARRAY['lemon verbena'], 'food', 'safe', 'safe', 'safe', 'safe', 'Infusion safe en grossesse à doses raisonnables.', 'CRAT', NULL),
('Mélisse', 'melissa officinalis', ARRAY['lemon balm'], 'food', 'safe', 'safe', 'safe', 'safe', 'Infusion safe. Apaisante, anti-stress.', 'CRAT', NULL),
('Fleur d''oranger', 'citrus aurantium flower', ARRAY['neroli', 'orange blossom'], 'food', 'safe', 'safe', 'safe', 'safe', 'Eau de fleur d''oranger safe en grossesse.', 'CRAT', NULL),

-- Plantes pour le sommeil
('Valériane', 'valeriana officinalis', ARRAY['valerian'], 'food', 'caution', 'caution', 'caution', 'caution', 'Pas de données suffisantes en grossesse. À éviter par principe de précaution.', 'CRAT', NULL),
('Passiflore', 'passiflora incarnata', ARRAY['passion flower'], 'food', 'caution', 'caution', 'caution', 'caution', 'Effets utérotoniques possibles. À éviter par précaution.', 'CRAT', NULL),
('Houblon', 'humulus lupulus', ARRAY['hops'], 'food', 'caution', 'caution', 'caution', 'caution', 'Effets oestrogéniques. À éviter par précaution.', 'CRAT', NULL),
('Lavande', 'lavandula angustifolia', ARRAY['lavender'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Huile essentielle : éviter pendant grossesse (camphre). Infusion : safe.', 'CRAT', NULL),

-- Plantes "drainantes" et diurétiques
('Ortie', 'urtica dioica', ARRAY['nettle'], 'food', 'caution', 'safe', 'safe', 'safe', 'Effet utérotonique possible T1. Safe T2-T3 et allaitement (galactogène).', 'CRAT', NULL),
('Pissenlit', 'taraxacum officinale', ARRAY['dandelion'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse. Diurétique léger.', 'CRAT', NULL),
('Bouleau', 'betula pendula', ARRAY['birch'], 'food', 'caution', 'caution', 'caution', 'safe', 'Pas de données suffisantes. À éviter par précaution.', 'CRAT', NULL),
('Reine-des-prés', 'filipendula ulmaria', ARRAY['meadowsweet'], 'food', 'danger', 'danger', 'danger', 'caution', 'Contient des dérivés salicylés. Contre-indiqué comme l''aspirine.', 'CRAT', NULL),

-- Plantes digestives
('Fenouil', 'foeniculum vulgare', ARRAY['fennel'], 'food', 'caution', 'safe', 'safe', 'safe', 'Doses culinaires : safe. Huile essentielle : éviter. Galactogène en allaitement.', 'CRAT', NULL),
('Anis', 'pimpinella anisum', ARRAY['anise'], 'food', 'caution', 'safe', 'safe', 'safe', 'Doses culinaires safe. Huile essentielle : éviter.', 'CRAT', NULL),
('Romarin', 'rosmarinus officinalis', ARRAY['rosemary'], 'food', 'caution', 'caution', 'caution', 'safe', 'Doses culinaires safe. Tisane forte ou HE : éviter (utérotonique).', 'CRAT', NULL),
('Thym', 'thymus vulgaris', ARRAY['thyme'], 'food', 'safe', 'safe', 'safe', 'safe', 'Doses culinaires safe. HE thymol : à diluer fortement.', 'CRAT', NULL),
('Basilic', 'ocimum basilicum', ARRAY['basil'], 'food', 'safe', 'safe', 'safe', 'safe', 'Doses culinaires safe.', 'CRAT', NULL),
('Coriandre', 'coriandrum sativum', ARRAY['coriander', 'cilantro'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse.', 'CRAT', NULL),
('Cumin', 'cuminum cyminum', ARRAY['cumin'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse à doses culinaires.', 'CRAT', NULL),
('Cannelle', 'cinnamomum verum', ARRAY['cinnamon'], 'food', 'caution', 'safe', 'safe', 'safe', 'Doses culinaires safe. Doses thérapeutiques (>1g/j) : utérotonique en T1.', 'CRAT', NULL),
('Clous de girofle', 'syzygium aromaticum', ARRAY['cloves'], 'food', 'caution', 'safe', 'safe', 'safe', 'Doses culinaires safe. HE eugénol : éviter.', 'CRAT', NULL),

-- Plantes pour la lactation
('Fenugrec', 'trigonella foenum-graecum', ARRAY['fenugreek'], 'food', 'danger', 'danger', 'caution', 'caution', 'Utérotonique en grossesse. Galactogène en allaitement mais effets indésirables (hypoglycémie) → à éviter par précaution.', 'CRAT', NULL),
('Chardon-Marie', 'silybum marianum', ARRAY['milk thistle'], 'food', 'caution', 'caution', 'caution', 'safe', 'Pas de données en grossesse. Safe en allaitement.', 'CRAT', NULL),
('Galéga', 'galega officinalis', ARRAY['goat''s rue'], 'food', 'caution', 'caution', 'caution', 'caution', 'Galactogène mais risque d''hypoglycémie maternelle/infantile.', 'CRAT', NULL),

-- Compléments et superaliments
('Spiruline', 'arthrospira platensis', ARRAY['spirulina'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse aux doses recommandées (jusqu''à 3g/jour).', 'CRAT', NULL),
('Maca', 'lepidium meyenii', ARRAY['maca root'], 'food', 'caution', 'caution', 'caution', 'caution', 'Pas de données en grossesse. À éviter par précaution.', 'CRAT', NULL),
('Ginkgo biloba', 'ginkgo biloba', ARRAY['ginkgo'], 'food', 'caution', 'caution', 'danger', 'caution', 'Anticoagulant : risque hémorragique surtout T3. À éviter.', 'CRAT', NULL),
('Millepertuis', 'hypericum perforatum', ARRAY['st john''s wort'], 'food', 'caution', 'caution', 'caution', 'caution', 'Interactions médicamenteuses nombreuses. Pas de données en grossesse. À éviter.', 'CRAT', NULL),
('Échinacée', 'echinacea purpurea', ARRAY['echinacea'], 'food', 'caution', 'caution', 'caution', 'safe', 'Pas de données suffisantes en grossesse. Safe en allaitement courts.', 'CRAT', NULL),
('Ortie dioïque', 'urtica dioica', ARRAY['nettle root'], 'food', 'caution', 'safe', 'safe', 'safe', 'Racine d''ortie : éviter T1. Feuille : safe.', 'CRAT', NULL),

-- Thés / cafés
('Thé vert', 'camellia sinensis', ARRAY['green tea', 'matcha'], 'food', 'caution', 'safe', 'safe', 'safe', 'Limiter à 2 tasses/jour (caféine). Antioxydants OK.', 'CRAT', NULL),
('Thé noir', 'camellia sinensis fermented', ARRAY['black tea'], 'food', 'caution', 'safe', 'safe', 'safe', 'Limiter à 2 tasses/jour (caféine).', 'CRAT', NULL),
('Yerba maté', 'ilex paraguariensis', ARRAY['mate', 'yerba mate'], 'food', 'danger', 'caution', 'caution', 'caution', 'Risque de prématurité et faible poids à la naissance documenté. À éviter.', 'CRAT', NULL),
('Café', 'coffea arabica', ARRAY['coffee'], 'food', 'caution', 'caution', 'caution', 'safe', 'Limiter à 2 tasses/jour (200mg caféine max).', 'CRAT', NULL),
('Roïbos', 'aspalathus linearis', ARRAY['rooibos'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse. Sans caféine.', 'CRAT', NULL),

-- Tisanes mixtes courantes
('Hibiscus', 'hibiscus sabdariffa', ARRAY['bissap', 'karkadé'], 'food', 'caution', 'caution', 'caution', 'safe', 'Effet hypotenseur. Éviter à fortes doses en grossesse.', 'CRAT', NULL)

ON CONFLICT (name_inci) DO NOTHING;

-- ─── PARTIE 4 — Index pour la nouvelle colonne dose ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_ingredients_max_dose
  ON ingredients(max_dose_mg_per_day)
  WHERE max_dose_mg_per_day IS NOT NULL;

COMMIT;

-- ─── Vérification post-migration (à exécuter séparément, hors transaction) ──
-- SELECT name, max_dose_mg_per_day, dose_unit, dose_note
-- FROM ingredients
-- WHERE max_dose_mg_per_day IS NOT NULL
-- ORDER BY max_dose_mg_per_day DESC;
--
-- SELECT COUNT(*) AS plantes_seeded
-- FROM ingredients
-- WHERE source = 'CRAT' AND category = 'food';
