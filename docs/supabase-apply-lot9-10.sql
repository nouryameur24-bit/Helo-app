-- ────────────────────────────────────────────────────────────────────────────
-- Hēlo — SQL consolidé Lot 9 + Lot 10 (à exécuter dans Supabase SQL Editor)
--
-- Ce fichier contient TOUT ce qu'il reste à appliquer côté Supabase pour
-- activer les améliorations des Lot 9 (coverage) et Lot 10 (ghost capture) :
--
--   1. Vérification de la RPC ghost_capture_upsert (Lot 10 — feature star)
--   2. Synonymes top 30 ingrédients (Lot 9 — boost match rate 5-10%)
--   3. E-numbers v4 (Lot 9 — comble le gap E500-E1450)
--
-- Procédure :
--   a) Copier ce fichier : `cat docs/supabase-apply-lot9-10.sql | pbcopy`
--   b) Supabase Dashboard → SQL Editor → New query → Cmd+V → Run
--   c) Vérifier les messages "Success" + lancer les queries de vérif en bas
-- ────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOC 1 — Vérification ghost_capture_upsert
-- ═══════════════════════════════════════════════════════════════════════════
-- Si cette query retourne 0 ligne, exécute artifacts/helo/supabase/
-- migration-ghost-capture.sql AVANT le bloc 2/3.

SELECT proname AS function_name, pronargs AS num_args
FROM pg_proc
WHERE proname = 'ghost_capture_upsert';
-- Attendu : 1 ligne (ghost_capture_upsert, 6 args)

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOC 2 — Synonymes top 30 ingrédients (Lot 9)
-- ═══════════════════════════════════════════════════════════════════════════
-- Idempotent : utilise SELECT DISTINCT pour fusionner sans doublon.

-- Allergènes alimentaires majeurs
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['milk','leche','milch','latte','melk','lait écrémé','lait entier','lait demi-écrémé','lait en poudre','lait UHT','milk powder','skimmed milk']))) WHERE LOWER(name_inci) = LOWER('lait');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['œuf','egg','egg white','egg yolk','blanc d''œuf','jaune d''œuf','huevo','ovo','uovo']))) WHERE LOWER(name_inci) = LOWER('oeuf');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['gluten','wheat gluten','gluten de blé','gluten de froment']))) WHERE LOWER(name_inci) = LOWER('gluten');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['soy','soya','soja','lécithine de soja','soy lecithin','soybean','isolat de soja','protéines de soja']))) WHERE LOWER(name_inci) = LOWER('soja');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['peanut','arachis','arachis hypogaea','huile d''arachide','peanut oil','groundnut']))) WHERE LOWER(name_inci) = LOWER('arachide');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['hazelnut','corylus avellana','noisettes','pâte de noisette','hazelnut paste']))) WHERE LOWER(name_inci) = LOWER('noisette');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['almond','prunus amygdalus dulcis','huile d''amande','almond oil','lait d''amande','almond milk']))) WHERE LOWER(name_inci) = LOWER('amande');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['sésame','sesame','sesamum indicum','huile de sésame','tahin','tahini']))) WHERE LOWER(name_inci) = LOWER('sesame');

-- Conservateurs cosmétiques top 10
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['methyl paraben','methyl 4-hydroxybenzoate','e218','nipagine','cas-99-76-3']))) WHERE LOWER(name_inci) = LOWER('methylparaben');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['propyl paraben','propyl 4-hydroxybenzoate','e216','cas-94-13-3']))) WHERE LOWER(name_inci) = LOWER('propylparaben');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['butyl paraben','butyl 4-hydroxybenzoate','cas-94-26-8']))) WHERE LOWER(name_inci) = LOWER('butylparaben');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['ethyl paraben','ethyl 4-hydroxybenzoate','e214','cas-120-47-8']))) WHERE LOWER(name_inci) = LOWER('ethylparaben');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['phénoxyéthanol','phenoxyethanol','2-phenoxyethanol','cas-122-99-6']))) WHERE LOWER(name_inci) = LOWER('phenoxyethanol');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['benzoate de sodium','e211','cas-532-32-1']))) WHERE LOWER(name_inci) = LOWER('sodium benzoate');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['sorbate de potassium','e202','cas-24634-61-5']))) WHERE LOWER(name_inci) = LOWER('potassium sorbate');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['triclosan','5-chloro-2-(2,4-dichlorophenoxy)phenol','cas-3380-34-5','irgasan']))) WHERE LOWER(name_inci) = LOWER('triclosan');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['méthylisothiazolinone','MIT','kathon','cas-2682-20-4']))) WHERE LOWER(name_inci) = LOWER('methylisothiazolinone');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['méthylchloroisothiazolinone','MCIT','kathon CG','cas-26172-55-4']))) WHERE LOWER(name_inci) = LOWER('methylchloroisothiazolinone');

-- Tensioactifs cosmétiques
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['SLS','sulfate de laurylsodium','sodium dodecyl sulfate','lauryl sulfate de sodium','cas-151-21-3']))) WHERE LOWER(name_inci) = LOWER('sodium lauryl sulfate');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['SLES','sodium lauryl ether sulfate','sulfate de laurethsodium','cas-9004-82-4']))) WHERE LOWER(name_inci) = LOWER('sodium laureth sulfate');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['cocamidopropylbétaïne','CAPB','cocoamphoacétate','cas-61789-40-0']))) WHERE LOWER(name_inci) = LOWER('cocamidopropyl betaine');

-- Perturbateurs endocriniens connus
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['BPA','bisphénol A','bisphenol a','cas-80-05-7','2,2-bis(4-hydroxyphenyl)propane']))) WHERE LOWER(name_inci) = LOWER('bisphenol_a');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['benzophénone-3','benzophenone-3','BP-3','oxybenzone','cas-131-57-7']))) WHERE LOWER(name_inci) = LOWER('oxybenzone');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['octocrylène','octocrylene','cas-6197-30-4']))) WHERE LOWER(name_inci) = LOWER('octocrylene');

-- Rétinoïdes (contre-indication grossesse)
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['rétinol','vitamine A','vitamin A','retinyl','rétinyle']))) WHERE LOWER(name_inci) = LOWER('retinol');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['palmitate de rétinyle','retinyl palmitate','vitamin A palmitate','cas-79-81-2']))) WHERE LOWER(name_inci) = LOWER('retinyl palmitate');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['trétinoïne','tretinoin','acide rétinoïque','retinoic acid','cas-302-79-4','isotrétinoïne','isotretinoin']))) WHERE LOWER(name_inci) = LOWER('tretinoin');

-- Médicaments fréquents
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['paracétamol','acetaminophen','acetaminophène','doliprane','efferalgan','dafalgan','cas-103-90-2','n-acetyl-para-aminophenol']))) WHERE LOWER(name_inci) = LOWER('paracetamol');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['ibuprofène','ibuprofen','nurofen','advil','spedifen','cas-15687-27-1']))) WHERE LOWER(name_inci) = LOWER('ibuprofene');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['aspirine','acide acétylsalicylique','acetylsalicylic acid','ASA','cas-50-78-2','aspegic']))) WHERE LOWER(name_inci) = LOWER('aspirine');

-- Caféine et stimulants
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['caféine','caffeine','1,3,7-trimethylxanthine','cas-58-08-2','guaranine','matéine','théine']))) WHERE LOWER(name_inci) = LOWER('cafeine');
UPDATE public.ingredients SET synonyms = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY['taurine','acide 2-aminoéthylsulfonique','cas-107-35-7']))) WHERE LOWER(name_inci) = LOWER('taurine');

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOC 3 — E-numbers v4 (Lot 9, comble gap E500-E1450)
-- ═══════════════════════════════════════════════════════════════════════════
-- Idempotent : INSERT ... WHERE NOT EXISTS pour ne pas dupliquer.

INSERT INTO public.ingredients (name_inci, name, category, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description_fr, source)
SELECT * FROM (VALUES
  -- E500-599 : Acides, bases, anti-agglomérants
  ('e500',  'E500 Carbonates de sodium',        'food', 'safe', 'safe', 'safe', 'safe', 'Régulateur d''acidité. Présent dans pains, boissons. Inoffensif aux doses alimentaires.', 'EFSA, ANSES'),
  ('e501',  'E501 Carbonates de potassium',     'food', 'safe', 'safe', 'safe', 'safe', 'Régulateur d''acidité similaire à E500. Sans risque grossesse.', 'EFSA, ANSES'),
  ('e503',  'E503 Carbonates d''ammonium',      'food', 'safe', 'safe', 'safe', 'safe', 'Levant chimique (biscuits). Sans risque aux doses normales.', 'EFSA, ANSES'),
  ('e504',  'E504 Carbonates de magnésium',     'food', 'safe', 'safe', 'safe', 'safe', 'Anti-agglomérant. Sans risque grossesse.', 'EFSA, ANSES'),
  ('e509',  'E509 Chlorure de calcium',         'food', 'safe', 'safe', 'safe', 'safe', 'Affermissant (fromages, conserves). Sans risque.', 'EFSA, ANSES'),
  ('e511',  'E511 Chlorure de magnésium',       'food', 'safe', 'safe', 'safe', 'safe', 'Affermissant (tofu). Sans risque.', 'EFSA, ANSES'),
  ('e524',  'E524 Hydroxyde de sodium',         'food', 'safe', 'safe', 'safe', 'safe', 'Régulateur d''acidité (cacao, bretzels). Inoffensif aux doses alimentaires.', 'EFSA, ANSES'),
  ('e551',  'E551 Dioxyde de silicium',         'food', 'safe', 'safe', 'safe', 'safe', 'Anti-agglomérant ultra-courant (sels, épices, compléments). Inerte digestif.', 'EFSA, ANSES'),
  ('e553b', 'E553b Talc',                       'food', 'caution', 'caution', 'caution', 'safe', 'Anti-agglomérant. Contamination amiante possible selon source — préférer éviter en grossesse.', 'EFSA, ANSES'),
  -- E600-699 : Exhausteurs de goût
  ('e620',  'E620 Acide glutamique',            'food', 'safe', 'safe', 'safe', 'safe', 'Acide aminé naturel. Sans risque aux doses alimentaires.', 'EFSA, ANSES'),
  ('e621',  'E621 Glutamate monosodique (MSG)', 'food', 'caution', 'caution', 'caution', 'safe', 'Exhausteur de saveur. Très débattu : OMS dit safe, mais la prudence en grossesse est recommandée vu les apports cumulés.', 'EFSA, ANSES'),
  ('e631',  'E631 Inosinate de sodium',         'food', 'safe', 'safe', 'safe', 'safe', 'Exhausteur de saveur (chips, soupes). Sans risque connu.', 'EFSA, ANSES'),
  ('e635',  'E635 Ribonucléotides de sodium',   'food', 'safe', 'safe', 'safe', 'safe', 'Exhausteur (souvent combiné E621). Sans risque grossesse aux doses alimentaires.', 'EFSA, ANSES'),
  -- E900-999 : Cires, gaz, antimousse
  ('e901',  'E901 Cire d''abeille',             'food', 'safe', 'safe', 'safe', 'safe', 'Agent d''enrobage (bonbons). Inoffensif.', 'EFSA, ANSES'),
  ('e903',  'E903 Cire de carnauba',            'food', 'safe', 'safe', 'safe', 'safe', 'Agent d''enrobage végétal. Sans risque.', 'EFSA, ANSES'),
  ('e904',  'E904 Shellac',                     'food', 'safe', 'safe', 'safe', 'safe', 'Agent d''enrobage (chocolats, fruits). Origine insecte. Sans risque.', 'EFSA, ANSES'),
  ('e920',  'E920 L-cystéine',                  'food', 'safe', 'safe', 'safe', 'safe', 'Améliorant farine. Acide aminé. Sans risque.', 'EFSA, ANSES'),
  -- E950-969 : Édulcorants artificiels
  ('e950',  'E950 Acésulfame K',                'food', 'caution', 'caution', 'caution', 'caution', 'Édulcorant artificiel. Pas tératogène établi mais préférable de modérer en grossesse.', 'EFSA, ANSES'),
  ('e951',  'E951 Aspartame',                   'food', 'caution', 'caution', 'danger', 'caution', 'Édulcorant. Contre-indiqué en phénylcétonurie. À éviter en T3 (controverses sur passage placentaire).', 'EFSA, ANSES'),
  ('e952',  'E952 Cyclamate',                   'food', 'danger', 'danger', 'danger', 'caution', 'Édulcorant artificiel. Interdit aux USA. ANSES recommande d''éviter en grossesse.', 'EFSA, ANSES'),
  ('e954',  'E954 Saccharine',                  'food', 'caution', 'caution', 'caution', 'caution', 'Édulcorant. Traverse le placenta. À limiter fortement en grossesse.', 'EFSA, ANSES'),
  ('e955',  'E955 Sucralose',                   'food', 'caution', 'caution', 'caution', 'safe', 'Édulcorant. Données rassurantes mais privilégier les apports naturels en grossesse.', 'EFSA, ANSES'),
  ('e960',  'E960 Glycosides de stéviol',       'food', 'safe', 'safe', 'safe', 'safe', 'Édulcorant naturel (stevia). Considéré safe par EFSA même en grossesse aux doses normales.', 'EFSA, ANSES'),
  ('e968',  'E968 Érythritol',                  'food', 'safe', 'safe', 'safe', 'safe', 'Polyol naturel. EFSA safe en grossesse.', 'EFSA, ANSES'),
  -- E1000-1999 : Amidons modifiés (omniprésents)
  ('e1404', 'E1404 Amidon oxydé',               'food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié. Inerte digestif. Sans risque.', 'EFSA, ANSES'),
  ('e1410', 'E1410 Phosphate de monoamidon',    'food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié stabilisateur. Sans risque.', 'EFSA, ANSES'),
  ('e1412', 'E1412 Phosphate de diamidon',      'food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié (sauces, soupes). Sans risque.', 'EFSA, ANSES'),
  ('e1414', 'E1414 Phosphate de diamidon acétylé', 'food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié. Sans risque.', 'EFSA, ANSES'),
  ('e1422', 'E1422 Adipate de diamidon acétylé', 'food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié stabilisateur. Sans risque.', 'EFSA, ANSES'),
  ('e1442', 'E1442 Phosphate d''hydroxypropyl-diamidon', 'food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié (yaourts, pâtisseries). Sans risque.', 'EFSA, ANSES'),
  ('e1450', 'E1450 Octenyl-succinate d''amidon','food', 'safe', 'safe', 'safe', 'safe', 'Amidon modifié. Sans risque aux doses alimentaires.', 'EFSA, ANSES'),
  -- E150 série : Caramels controversés
  ('e150b', 'E150b Caramel de sulfite caustique', 'food', 'caution', 'caution', 'caution', 'caution', 'Caramel modifié. Préférer E150a (caramel ordinaire) en grossesse.', 'EFSA, ANSES'),
  ('e150c', 'E150c Caramel ammoniacal',          'food', 'caution', 'caution', 'caution', 'caution', 'Caramel modifié (4-MEI controverse). À limiter en grossesse.', 'EFSA, ANSES'),
  ('e150d', 'E150d Caramel sulfite-ammoniacal',  'food', 'caution', 'caution', 'caution', 'caution', 'Caramel modifié (Coca-Cola). Présence de 4-MEI — à limiter en grossesse.', 'EFSA, ANSES')
) AS new_entries(name_inci, name, category, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description_fr, source)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredients i WHERE LOWER(i.name_inci) = LOWER(new_entries.name_inci)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS finales (lancer après les blocs ci-dessus)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Combien d'E-numbers v4 ont été insérés ? (entre 0 et 33 selon ce qui existait déjà)
SELECT COUNT(*) AS e_numbers_v4_count
FROM public.ingredients
WHERE name_inci IN (
  'e500','e501','e503','e504','e509','e511','e524','e551','e553b',
  'e620','e621','e631','e635',
  'e901','e903','e904','e920',
  'e950','e951','e952','e954','e955','e960','e968',
  'e1404','e1410','e1412','e1414','e1422','e1442','e1450',
  'e150b','e150c','e150d'
);

-- 2. Vérifier que les synonymes ont bien été mis à jour (sample)
SELECT name_inci, synonyms
FROM public.ingredients
WHERE LOWER(name_inci) IN ('paracetamol','cafeine','retinol','phenoxyethanol')
ORDER BY name_inci;
-- Attendu : 4 lignes avec des synonyms étoffées.
