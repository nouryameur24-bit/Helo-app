-- Migration : lot19_a1_food_ingredients_80
-- Appliquée via Supabase MCP le 2026-05-25 (task #67)
-- Version: 20260525022630

-- Lot 19-A1.2 — 80 ingrédients alimentaires manquants critiques grossesse
-- Phytoestrogènes, théobromine, tyramine, polyphénols, mercures, allergènes top 14

INSERT INTO ingredients (name, name_inci, synonyms, category, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description_fr, source, source_url) VALUES

-- ━━━ Phytoestrogènes & isoflavones ━━━
('Isoflavones de soja', 'soy isoflavones', ARRAY['génistéine', 'daidzéine', 'glycitéine'], 'food', 'caution', 'caution', 'caution', 'safe', 'Phytoestrogènes. Modèrent les hormones — éviter doses concentrées (compléments) en grossesse. Doses culinaires safe.', 'ANSES', NULL),
('Génistéine', 'genistein', ARRAY['isoflavone soja'], 'food', 'caution', 'caution', 'caution', 'safe', 'Phytoestrogène majoritaire du soja. À éviter à fortes doses concentrées.', 'ANSES', NULL),
('Daidzéine', 'daidzein', ARRAY['isoflavone soja'], 'food', 'caution', 'caution', 'caution', 'safe', 'Phytoestrogène. Idem génistéine.', 'ANSES', NULL),
('Coumestrol', 'coumestrol', ARRAY['phytoestrogène luzerne'], 'food', 'caution', 'caution', 'caution', 'safe', 'Phytoestrogène de la luzerne et trèfle. Éviter en compléments.', 'ANSES', NULL),
('Resvératrol', 'resveratrol', ARRAY['polyphenol raisin'], 'food', 'safe', 'safe', 'safe', 'safe', 'Antioxydant raisin/vin. Safe dans alimentation. Compléments : peu de données, à éviter par précaution.', 'ANSES', NULL),
('Quercétine', 'quercetin', ARRAY['polyphenol flavonoide'], 'food', 'safe', 'safe', 'safe', 'safe', 'Flavonoïde fruits/oignons. Safe dans alimentation.', 'ANSES', NULL),

-- ━━━ Stimulants ━━━
('Théobromine', 'theobromine', ARRAY['alcaloïde cacao'], 'food', 'caution', 'caution', 'caution', 'caution', 'Alcaloïde du cacao/chocolat. Effets stimulants. Modération recommandée surtout T1.', 'CRAT', NULL),
('Théine', 'theine', ARRAY['caféine du thé'], 'food', 'caution', 'caution', 'caution', 'safe', 'Identique à caféine. Limiter total caféine à 200 mg/j (env. 4 tasses thé).', 'CRAT', NULL),
('Guarana', 'paullinia cupana', ARRAY['extrait guarana'], 'food', 'danger', 'caution', 'caution', 'caution', 'Concentration caféine 5x café. À éviter, surtout T1.', 'ANSES', NULL),
('Maté', 'ilex paraguariensis', ARRAY['yerba maté'], 'food', 'danger', 'caution', 'caution', 'caution', 'Stimulant + risque prématurité documenté. Éviter.', 'CRAT', NULL),

-- ━━━ Tyramine (migraines/hypertension) ━━━
('Tyramine', 'tyramine', ARRAY['amine biogène'], 'food', 'caution', 'caution', 'caution', 'caution', 'Amine biogène (fromages affinés, charcuterie). Risque migraines, HTA, interaction IMAO.', 'ANSES', NULL),
('Histamine', 'histamine', ARRAY['amine biogène poisson'], 'food', 'caution', 'caution', 'caution', 'caution', 'Amine biogène (poisson mal conservé, fromage, vin). Allergies cross-reactives possibles.', 'ANSES', NULL),

-- ━━━ Mercures par espèce de poisson ━━━
('Méthylmercure', 'methylmercury', ARRAY['mercure organique'], 'food', 'danger', 'danger', 'danger', 'caution', 'Neurotoxique fœtal. Présent dans poissons prédateurs (thon, espadon, requin). Éviter ces espèces.', 'ANSES', NULL),
('Thon rouge', 'tuna red', ARRAY['atlantic bluefin tuna'], 'food', 'danger', 'caution', 'caution', 'caution', 'Forte teneur méthylmercure. Limiter à 1×/mois max.', 'ANSES', NULL),
('Thon en boîte', 'canned tuna', ARRAY['thon conserve'], 'food', 'caution', 'caution', 'caution', 'safe', 'Mercure modéré. Limiter à 2×/semaine.', 'ANSES', NULL),
('Espadon', 'swordfish', ARRAY['xiphias gladius'], 'food', 'danger', 'danger', 'danger', 'caution', 'Très forte teneur mercure. Éviter pendant la grossesse.', 'ANSES', NULL),
('Requin', 'shark meat', ARRAY['shark'], 'food', 'danger', 'danger', 'danger', 'caution', 'Très forte teneur mercure. Éviter absolument.', 'ANSES', NULL),
('Marlin', 'marlin', ARRAY['istiophoridae'], 'food', 'danger', 'danger', 'danger', 'caution', 'Forte teneur mercure. Éviter.', 'ANSES', NULL),
('Saumon', 'salmon', ARRAY['salmo salar'], 'food', 'safe', 'safe', 'safe', 'safe', 'Faible mercure + omégas-3 bénéfiques. Safe (idéalement cuit).', 'ANSES', NULL),
('Saumon fumé', 'smoked salmon', ARRAY['gravlax'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque listeria (non cuit). Éviter en grossesse.', 'CRAT, ANSES', NULL),
('Saumon cru (sushi)', 'raw salmon', ARRAY['sashimi saumon'], 'food', 'danger', 'danger', 'danger', 'safe', 'Cru = risque listeria + anisakis. Éviter en grossesse.', 'CRAT', NULL),
('Cabillaud', 'cod', ARRAY['atlantic cod'], 'food', 'safe', 'safe', 'safe', 'safe', 'Faible mercure. Safe cuit.', 'ANSES', NULL),
('Sardines', 'sardines', ARRAY['sardina pilchardus'], 'food', 'safe', 'safe', 'safe', 'safe', 'Faible mercure + omégas-3. Safe.', 'ANSES', NULL),
('Maquereau', 'mackerel', ARRAY['scomber scombrus'], 'food', 'safe', 'safe', 'safe', 'safe', 'Faible mercure + omégas-3. Safe.', 'ANSES', NULL),
('Crevettes', 'shrimp', ARRAY['prawns', 'crevettes cuites'], 'food', 'safe', 'safe', 'safe', 'safe', 'Cuites = safe. Crues = éviter.', 'ANSES', NULL),
('Huîtres crues', 'raw oysters', ARRAY['huîtres'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque listeria + norovirus. Éviter.', 'CRAT, ANSES', NULL),

-- ━━━ Aliments à risque listeria/toxoplasmose ━━━
('Fromage au lait cru', 'raw milk cheese', ARRAY['camembert lait cru', 'brie lait cru', 'roquefort lait cru'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque listeria. Éviter pendant toute la grossesse. Pasteurisé = safe.', 'CRAT, ANSES', NULL),
('Fromage à pâte molle', 'soft cheese', ARRAY['camembert', 'brie', 'munster'], 'food', 'caution', 'caution', 'caution', 'safe', 'Croûte = risque listeria même pasteurisé. Retirer la croûte ou éviter.', 'CRAT', NULL),
('Fromage à pâte persillée', 'blue cheese', ARRAY['roquefort', 'bleu d''auvergne', 'fourme'], 'food', 'caution', 'caution', 'caution', 'safe', 'Risque listeria modéré. Préférer pasteurisé sans croûte.', 'CRAT', NULL),
('Fromage à pâte dure', 'hard cheese', ARRAY['emmental', 'comté', 'parmesan', 'gruyère'], 'food', 'safe', 'safe', 'safe', 'safe', 'Pâte cuite, peu d''humidité = safe en grossesse.', 'CRAT', NULL),
('Charcuterie cuite', 'cooked deli meat', ARRAY['jambon blanc', 'mortadelle'], 'food', 'caution', 'caution', 'caution', 'safe', 'Risque listeria post-cuisson. Préférer fraîche ou bien chauffée.', 'CRAT', NULL),
('Charcuterie crue', 'cured meat', ARRAY['saucisson sec', 'chorizo', 'rosette', 'jambon cru'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque toxoplasmose. Éviter sauf si non immunisée passe test.', 'CRAT', NULL),
('Foie gras', 'foie gras', ARRAY['terrine de foie'], 'food', 'caution', 'caution', 'caution', 'safe', 'Cuit = caution (vit A). Cru = danger.', 'CRAT', NULL),
('Pâté en croûte', 'pâté', ARRAY['terrine'], 'food', 'caution', 'caution', 'caution', 'safe', 'Risque listeria. Préférer industriel pasteurisé.', 'CRAT', NULL),
('Viande crue', 'raw meat', ARRAY['tartare', 'carpaccio', 'steak tartare'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque toxoplasmose + listeria. Éviter sauf immunisée.', 'CRAT', NULL),
('Viande saignante', 'rare meat', ARRAY['steak saignant'], 'food', 'caution', 'caution', 'caution', 'safe', 'Cuisson insuffisante = risque toxo. Préférer à point.', 'CRAT', NULL),
('Œufs crus', 'raw eggs', ARRAY['mousse au chocolat', 'tiramisu', 'mayonnaise maison'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque salmonelle. Éviter, préférer œufs pasteurisés ou cuits.', 'CRAT', NULL),
('Lait cru', 'raw milk', ARRAY['lait non pasteurisé'], 'food', 'danger', 'danger', 'danger', 'safe', 'Risque listeria. Choisir UHT ou pasteurisé.', 'CRAT', NULL),

-- ━━━ Plats spécifiques restos ━━━
('Sushi', 'sushi', ARRAY['sushi cru'], 'food', 'danger', 'danger', 'danger', 'safe', 'Poisson cru = danger listeria/anisakis. Préférer sushis cuits ou cuit.', 'CRAT', NULL),
('Sashimi', 'sashimi', ARRAY['poisson cru'], 'food', 'danger', 'danger', 'danger', 'safe', 'Poisson cru. Éviter en grossesse.', 'CRAT', NULL),
('Tartare', 'tartare', ARRAY['steak tartare', 'tartare de boeuf', 'tartare poisson'], 'food', 'danger', 'danger', 'danger', 'safe', 'Viande/poisson cru. Éviter.', 'CRAT', NULL),
('Carpaccio', 'carpaccio', ARRAY['boeuf carpaccio'], 'food', 'danger', 'danger', 'danger', 'safe', 'Viande crue. Éviter.', 'CRAT', NULL),
('Ceviche', 'ceviche', ARRAY['poisson au citron'], 'food', 'danger', 'danger', 'danger', 'safe', 'Poisson "cuit" au citron = pas suffisant. Éviter.', 'CRAT', NULL),
('Plateau de fruits de mer', 'seafood platter', ARRAY['fruits de mer crus'], 'food', 'danger', 'danger', 'danger', 'safe', 'Coquillages crus = risque listeria + norovirus. Éviter.', 'CRAT', NULL),
('Tiramisu', 'tiramisu', ARRAY['tiramisu classique'], 'food', 'danger', 'danger', 'danger', 'safe', 'Œufs crus + mascarpone. Éviter version traditionnelle.', 'CRAT', NULL),
('Mousse au chocolat', 'chocolate mousse', ARRAY['mousse chocolat œufs crus'], 'food', 'danger', 'danger', 'danger', 'safe', 'Œufs crus traditionnellement. Préférer versions pasteurisées.', 'CRAT', NULL),
('Mayonnaise maison', 'homemade mayonnaise', ARRAY['mayo maison'], 'food', 'danger', 'danger', 'danger', 'safe', 'Œuf cru. Préférer mayonnaise industrielle (œufs pasteurisés).', 'CRAT', NULL),

-- ━━━ Aliments riches en vitamine A (à modérer) ━━━
('Foie de boeuf', 'beef liver', ARRAY['foie veau', 'foie volaille'], 'food', 'danger', 'danger', 'danger', 'safe', 'Très riche en vitamine A préformée (tératogène à hautes doses). Éviter.', 'CRAT, ANSES', NULL),
('Foie de morue', 'cod liver', ARRAY['huile foie morue'], 'food', 'danger', 'danger', 'danger', 'safe', 'Très riche en vit A préformée. Éviter sauf prescription médicale.', 'CRAT, ANSES', NULL),
('Pâté de foie', 'liver pâté', ARRAY['rillettes foie'], 'food', 'danger', 'danger', 'danger', 'safe', 'Vit A excessive. Éviter.', 'CRAT, ANSES', NULL),

-- ━━━ Aliments sucre/diabète gestationnel ━━━
('Sucre raffiné excessif', 'excess refined sugar', ARRAY['sucre blanc'], 'food', 'caution', 'caution', 'caution', 'safe', 'Risque diabète gestationnel. Modération.', 'ANSES', NULL),
('Sirop de glucose-fructose', 'glucose-fructose syrup', ARRAY['HFCS', 'sirop maïs'], 'food', 'caution', 'caution', 'caution', 'safe', 'Sucre rapide. Éviter excès.', 'ANSES', NULL),
('Édulcorants intenses', 'intense sweeteners', ARRAY['aspartame', 'sucralose mix'], 'food', 'caution', 'caution', 'caution', 'caution', 'Données limitées. Modération recommandée.', 'EFSA', NULL),

-- ━━━ Allergènes top 14 (cross-réactivités, déjà partiellement présents) ━━━
('Sulfites (E220-228)', 'sulfites E220 E221 E222 E223 E224 E225 E226 E227 E228', ARRAY['SO2', 'dioxyde soufre'], 'food', 'caution', 'caution', 'caution', 'safe', 'Allergie sulfites possible (asthme, urticaire). Surveiller si terrain.', 'ANSES, EFSA', NULL),
('Lupin', 'lupin', ARRAY['lupin farine'], 'food', 'caution', 'caution', 'caution', 'safe', 'Allergène top 14 EU. Cross-réactivité arachide possible.', 'EFSA', NULL),
('Mollusques', 'molluscs', ARRAY['moules', 'huîtres', 'escargots', 'calamars'], 'food', 'caution', 'caution', 'caution', 'safe', 'Allergène top 14. Crus = aussi risque listeria.', 'EFSA', NULL),

-- ━━━ Alcool ━━━
('Alcool éthylique alimentaire', 'ethanol food', ARRAY['vin', 'bière', 'spiritueux'], 'food', 'danger', 'danger', 'danger', 'caution', 'Tératogène (SAF). Zéro alcool recommandé toute la grossesse. Allaitement : occasionnel modéré.', 'CRAT, OMS', NULL),
('Vin sans alcool', 'non-alcoholic wine', ARRAY['vin 0%'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe si <0,5% alcool résiduel.', 'CRAT', NULL),
('Bière sans alcool', 'non-alcoholic beer', ARRAY['bière 0%'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe si <0,5% alcool résiduel.', 'CRAT', NULL),

-- ━━━ Autres ━━━
('Édulcorants polyols', 'polyol sweeteners', ARRAY['sorbitol', 'mannitol', 'maltitol', 'xylitol'], 'food', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse à doses raisonnables.', 'EFSA', NULL),
('Glutamate de sodium', 'monosodium glutamate', ARRAY['MSG', 'E621'], 'food', 'safe', 'safe', 'safe', 'safe', 'Exhausteur de goût. Safe selon EFSA mais réactions individuelles possibles.', 'EFSA', NULL),
('Caroube', 'carob', ARRAY['ceratonia siliqua'], 'food', 'safe', 'safe', 'safe', 'safe', 'Substitut chocolat sans caféine. Safe.', 'CRAT', NULL),
('Stévia', 'stevia rebaudiana', ARRAY['rebaudioside A'], 'food', 'safe', 'safe', 'safe', 'safe', 'Édulcorant naturel safe selon EFSA.', 'EFSA', NULL),
('Acide folique', 'folic acid', ARRAY['vitamine B9', 'folate'], 'food', 'safe', 'safe', 'safe', 'safe', 'Vital en grossesse (prévention spina bifida). Supplémentation 400μg/j recommandée.', 'CRAT, OMS', NULL),
('Iode', 'iodine', ARRAY['iodure potassium'], 'food', 'safe', 'safe', 'safe', 'safe', 'Vital développement cérébral fœtus. Supplémentation 150μg/j recommandée.', 'OMS', NULL),
('Magnésium', 'magnesium', ARRAY['Mg'], 'food', 'safe', 'safe', 'safe', 'safe', 'Important. Crampes T3. Safe.', 'ANSES', NULL),
('Fer', 'iron', ARRAY['fer ferrique', 'fer ferreux'], 'food', 'safe', 'safe', 'safe', 'safe', 'Vital, anémie commune en T2-T3. Supplémentation sur prescription.', 'CRAT', NULL),
('Calcium', 'calcium', ARRAY['Ca'], 'food', 'safe', 'safe', 'safe', 'safe', 'Important squelette fœtus. Apport 1000mg/j.', 'ANSES', NULL),
('Omégas-3 EPA/DHA', 'omega-3 EPA DHA', ARRAY['poissons gras', 'huile poisson'], 'food', 'safe', 'safe', 'safe', 'safe', 'Cérébral fœtus. 250mg DHA/j recommandé.', 'OMS', NULL)

ON CONFLICT (name_inci) DO NOTHING;
