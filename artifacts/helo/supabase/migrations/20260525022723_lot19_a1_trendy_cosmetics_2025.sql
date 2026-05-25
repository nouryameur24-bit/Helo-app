-- Migration : lot19_a1_trendy_cosmetics_2025
-- Appliquée via Supabase MCP le 2026-05-25 (task #67)
-- Version: 20260525022723

-- Lot 19-A1.3 — 30 ingrédients cosmétiques trendy 2024-2025
-- K-beauty + nouvelles tendances + ingrédients récents

INSERT INTO ingredients (name, name_inci, synonyms, category, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description_fr, source, source_url) VALUES

-- ━━━ K-beauty trendy ━━━
('Centella Asiatica (Cica)', 'centella asiatica extract', ARRAY['Cica', 'gotu kola', 'tiger grass', 'madecassoside'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Apaisant K-beauty. Safe en grossesse.', 'cosing', NULL),
('Madecassoside', 'madecassoside', ARRAY['centella derivative'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Triterpène isolé centella. Apaisant. Safe.', 'cosing', NULL),
('Asiaticoside', 'asiaticoside', ARRAY['centella triterpène'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Triterpène centella, cicatrisant. Safe.', 'cosing', NULL),
('Snail Mucin', 'snail secretion filtrate', ARRAY['mucine d''escargot', 'bave d''escargot'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'K-beauty hydratant/cicatrisant. Safe topique.', 'cosing', NULL),
('Mugwort', 'artemisia vulgaris extract', ARRAY['armoise extrait'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Armoise. Utérotonique. Éviter cosmétique en grossesse.', 'CRAT, cosing', NULL),
('Ginseng Cosmétique', 'panax ginseng extract', ARRAY['extrait ginseng'], 'cosmetic', 'caution', 'caution', 'caution', 'caution', 'Effets oestrogen-like mal documentés. Éviter par précaution.', 'cosing', NULL),
('Propolis', 'propolis extract', ARRAY['propolis brute'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Apaisant antibactérien. Safe topique (sauf allergie ruche).', 'cosing', NULL),
('Beta-Glucane', 'beta-glucan', ARRAY['avoine', 'levure'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Apaisant/hydratant. Safe.', 'cosing', NULL),

-- ━━━ Acides nouvelle génération ━━━
('Acide Tranéxamique', 'tranexamic acid', ARRAY['tranexamic acid topique'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Anti-mélasma topique. Voie systémique évitée en grossesse. Topique : peu de données, prudence.', 'cosing, crat', NULL),
('Acide Azélaïque (≤10%)', 'azelaic acid 10%', ARRAY['azelaic acid'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Anti-acné/anti-mélasma. Considéré safe en grossesse jusqu''à 20% topique.', 'CRAT, cosing', NULL),
('Acide Azélaïque (>15%)', 'azelaic acid 15%', ARRAY['azelaic acid haute concentration'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Concentrations >15% à utiliser avec avis médical.', 'CRAT', NULL),
('Acide Polyhydroxy (PHA)', 'polyhydroxy acid', ARRAY['gluconolactone', 'lactobionic acid'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Alternative douce aux AHA/BHA. Safe.', 'cosing', NULL),
('Acide Succinique', 'succinic acid', ARRAY['amber acid'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Anti-acné doux. Safe.', 'cosing', NULL),

-- ━━━ Peptides récents ━━━
('Matrixyl', 'palmitoyl pentapeptide-4', ARRAY['matrixyl 3000', 'lipopeptide'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Peptide anti-âge. Safe topique.', 'cosing', NULL),
('Matrixyl 3000', 'palmitoyl tripeptide-1 + palmitoyl tetrapeptide-7', ARRAY['matrixyl combo'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Combo peptides anti-âge. Safe.', 'cosing', NULL),
('Syn-Ake', 'dipeptide diaminobutyroyl benzylamide diacetate', ARRAY['snake peptide'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Peptide "botox-like" topique. Safe.', 'cosing', NULL),
('Syn-Coll', 'palmitoyl tripeptide-5', ARRAY['collagen booster peptide'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Stimule collagène. Safe.', 'cosing', NULL),
('GHK-Cu (Copper Peptide)', 'copper tripeptide-1', ARRAY['GHK-Cu', 'peptide de cuivre'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Peptide cuivre régénérant. Safe en cosmétique.', 'cosing', NULL),

-- ━━━ Hydratants nouvelle génération ━━━
('Polyglutamic Acid (PGA)', 'polyglutamic acid', ARRAY['acide polyglutamique'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', '10x plus hydratant que HA. Safe.', 'cosing', NULL),
('Tremella Mushroom', 'tremella fuciformis extract', ARRAY['snow mushroom', 'tremelle'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Hydratant champignon. Safe.', 'cosing', NULL),
('Squalène végétal', 'squalene', ARRAY['squalène olive'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Hydratant lipidique. Safe.', 'cosing', NULL),
('Phytosphingosine', 'phytosphingosine', ARRAY['sphingoid base'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Lipide cutané, ingrédient barrière. Safe.', 'cosing', NULL),

-- ━━━ Antioxidants ━━━
('Ergothioneine', 'ergothioneine', ARRAY['L-ergothioneine'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Antioxydant cellulaire. Safe topique.', 'cosing', NULL),
('Astaxanthine', 'astaxanthin', ARRAY['caroténoïde rouge'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Antioxydant puissant. Safe topique.', 'cosing', NULL),
('Resvératrol Topique', 'resveratrol topical', ARRAY['resveratrol cosmétique'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Anti-âge topique. Safe.', 'cosing', NULL),
('Idébénone', 'idebenone', ARRAY['CoQ10 analog'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Antioxydant. Safe topique.', 'cosing', NULL),

-- ━━━ Filtres solaires nouvelle gen ━━━
('Tinosorb A2B', 'tris-biphenyl triazine', ARRAY['nouvelle gen UV filter'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Filtre UV nouvelle génération. Safe en grossesse.', 'cosing', NULL),
('Uvinul T 150', 'ethylhexyl triazone', ARRAY['UVB filter'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Filtre UVB. Safe.', 'cosing', NULL),
('Uvinul A Plus', 'diethylamino hydroxybenzoyl hexyl benzoate', ARRAY['DHHB', 'UVA filter'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Filtre UVA récent. Safe.', 'cosing', NULL),

-- ━━━ Trendy "natural" ━━━
('Bakuchiol Pure', 'bakuchiol pure', ARRAY['rétinol naturel babchi'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Alternative naturelle au rétinol. Safe en grossesse, contrairement aux rétinoïdes.', 'cosing, crat', NULL),
('CBD Topique', 'cannabidiol', ARRAY['CBD cosmétique'], 'cosmetic', 'caution', 'caution', 'caution', 'caution', 'Données limitées en grossesse. Préférer éviter par précaution.', 'cosing, FDA', NULL),
('Probiotiques cosmétiques', 'lactobacillus ferment', ARRAY['ferment lactique cosmétique'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Microbiome cutané. Safe.', 'cosing', NULL)

ON CONFLICT (name_inci) DO NOTHING;
