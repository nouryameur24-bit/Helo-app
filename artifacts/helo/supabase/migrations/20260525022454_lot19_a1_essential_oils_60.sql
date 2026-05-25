-- Migration : lot19_a1_essential_oils_60
-- Appliquée via Supabase MCP le 2026-05-25 (task #67)
-- Version: 20260525022454

-- Lot 19-A1.1 — 60 huiles essentielles avec risk_level par phase
-- Source : CRAT, Aromathérapie médicale (Goeb/Couic-Marinier/Festy), Phytothérapie clinique
-- Convention : huile essentielle = cosmétique (usage topique/diffusion)
-- ON CONFLICT pour idempotence

INSERT INTO ingredients (name, name_inci, synonyms, category, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description_fr, source, source_url) VALUES

-- ━━━ DANGER tout trimestre (utérotoniques, neurotoxiques, hépatotoxiques) ━━━
('Huile essentielle Tea Tree', 'melaleuca alternifolia oil', ARRAY['HE arbre à thé', 'tea tree oil'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Forte concentration en cinéol. Contre-indiqué pendant toute la grossesse (passe la barrière placentaire). Allaitement à éviter (passage lait).', 'CRAT, Aromathérapie médicale', 'https://lecrat.fr/'),
('Huile essentielle Sauge officinale', 'salvia officinalis oil', ARRAY['HE sauge'], 'cosmetic', 'danger', 'danger', 'danger', 'danger', 'Thuyone neurotoxique + effet abortif. Contre-indication absolue grossesse + allaitement.', 'CRAT, Aromathérapie médicale', NULL),
('Huile essentielle Sauge sclarée', 'salvia sclarea oil', ARRAY['HE clary sage'], 'cosmetic', 'danger', 'danger', 'caution', 'caution', 'Oestrogen-like. Utilisée parfois pour déclencher l''accouchement à terme. Éviter T1-T2.', 'Aromathérapie médicale', NULL),
('Huile essentielle Romarin verbénone', 'rosmarinus officinalis verbenone oil', ARRAY['HE romarin verbenone'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Cétones neurotoxiques. Contre-indiqué pendant toute la grossesse.', 'CRAT', NULL),
('Huile essentielle Romarin camphré', 'rosmarinus officinalis camphor oil', ARRAY['HE romarin camphre'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Camphre neurotoxique foetal + utérotonique. CI absolue grossesse.', 'CRAT', NULL),
('Huile essentielle Menthe poivrée', 'mentha piperita oil', ARRAY['HE menthe poivrée', 'peppermint oil'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Menthol fortement passe placenta + diminue lactation. CI grossesse, prudence allaitement.', 'CRAT', NULL),
('Huile essentielle Eucalyptus globulus', 'eucalyptus globulus oil', ARRAY['HE eucalyptus globuleux'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Forte teneur 1,8-cinéole, risque convulsions néonatales. CI absolue grossesse, allaitement.', 'CRAT', NULL),
('Huile essentielle Eucalyptus radié', 'eucalyptus radiata oil', ARRAY['HE eucalyptus radiata'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Mieux toléré que globulus mais à éviter T1 par précaution. Safe en allaitement.', 'CRAT, Aromathérapie médicale', NULL),
('Huile essentielle Camphre', 'cinnamomum camphora oil', ARRAY['HE camphre', 'camphor oil'], 'cosmetic', 'danger', 'danger', 'danger', 'danger', 'Cétones neurotoxiques. CI absolue grossesse + allaitement.', 'CRAT, INRS', NULL),
('Huile essentielle Tanaisie', 'tanacetum vulgare oil', ARRAY['HE tanaisie'], 'cosmetic', 'danger', 'danger', 'danger', 'danger', 'Thuyone abortive. CI absolue grossesse + allaitement.', 'ANSES', NULL),
('Huile essentielle Armoise', 'artemisia vulgaris oil', ARRAY['HE armoise'], 'cosmetic', 'danger', 'danger', 'danger', 'danger', 'Thuyone + neurotoxique. CI absolue grossesse + allaitement.', 'ANSES', NULL),
('Huile essentielle Hysope', 'hyssopus officinalis oil', ARRAY['HE hyssope'], 'cosmetic', 'danger', 'danger', 'danger', 'danger', 'Cétones convulsivantes. CI absolue grossesse + allaitement.', 'ANSES', NULL),
('Huile essentielle Anis étoilé', 'illicium verum oil', ARRAY['HE anis étoilé', 'badiane'], 'cosmetic', 'danger', 'danger', 'caution', 'caution', 'Anéthole hormono-mimétique. CI T1-T2. Galactogène populaire en allaitement mais avec parcimonie.', 'CRAT', NULL),
('Huile essentielle Fenouil doux', 'foeniculum vulgare oil', ARRAY['HE fenouil'], 'cosmetic', 'danger', 'danger', 'caution', 'caution', 'Anéthole oestrogen-like. Éviter grossesse + allaitement courts uniquement.', 'CRAT', NULL),
('Huile essentielle Cèdre de l''Atlas', 'cedrus atlantica oil', ARRAY['HE cèdre atlas'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Cétones neurotoxiques. CI grossesse.', 'Aromathérapie médicale', NULL),
('Huile essentielle Pin sylvestre', 'pinus sylvestris oil', ARRAY['HE pin sylvestre'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Cortison-like. Éviter par précaution en grossesse.', 'Aromathérapie médicale', NULL),
('Huile essentielle Genévrier', 'juniperus communis oil', ARRAY['HE genièvre', 'HE juniperus'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Néphrotoxique + utérotonique. CI grossesse.', 'ANSES', NULL),
('Huile essentielle Origan', 'origanum vulgare oil', ARRAY['HE origan compact'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Carvacrol/thymol dermocaustiques. CI grossesse même très diluée.', 'Aromathérapie médicale', NULL),
('Huile essentielle Thym à thymol', 'thymus vulgaris thymol oil', ARRAY['HE thym thymol'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Phénol dermocaustique + utérotonique. CI grossesse.', 'Aromathérapie médicale', NULL),
('Huile essentielle Cannelle de Ceylan', 'cinnamomum verum oil', ARRAY['HE cannelle'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Aldéhyde cinnamique dermocaustique + utérotonique. CI grossesse.', 'CRAT', NULL),
('Huile essentielle Clous de girofle', 'syzygium aromaticum oil', ARRAY['HE girofle'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Eugénol fortement actif. CI grossesse.', 'Aromathérapie médicale', NULL),
('Huile essentielle Basilic exotique', 'ocimum basilicum oil', ARRAY['HE basilic'], 'cosmetic', 'danger', 'danger', 'caution', 'caution', 'Estragole hépatotoxique + utérotonique. CI T1-T2.', 'Aromathérapie médicale', NULL),
('Huile essentielle Estragon', 'artemisia dracunculus oil', ARRAY['HE estragon'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Estragole. CI grossesse.', 'Aromathérapie médicale', NULL),
('Huile essentielle Verveine citronnée', 'aloysia citrodora oil', ARRAY['HE verveine'], 'cosmetic', 'caution', 'caution', 'caution', 'caution', 'Citral irritant. Éviter par précaution.', 'Aromathérapie médicale', NULL),
('Huile essentielle Bay St-Thomas', 'pimenta racemosa oil', ARRAY['HE bay'], 'cosmetic', 'danger', 'danger', 'danger', 'caution', 'Eugénol dermocaustique. CI grossesse.', 'Aromathérapie médicale', NULL),

-- ━━━ CAUTION (à éviter par précaution mais pas catastrophique en cas d'usage occasionnel diffusé) ━━━
('Huile essentielle Citron', 'citrus limon oil', ARRAY['HE citron', 'lemon oil'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Furocoumarines photosensibilisantes. Éviter cutané au soleil. Diffusion possible.', 'Aromathérapie médicale', NULL),
('Huile essentielle Pamplemousse', 'citrus paradisi oil', ARRAY['HE pamplemousse'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Photosensibilisante. Éviter cutané au soleil.', 'Aromathérapie médicale', NULL),
('Huile essentielle Bergamote', 'citrus bergamia oil', ARRAY['HE bergamote'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Très photosensibilisante (bergaptène). Éviter cutané.', 'Aromathérapie médicale', NULL),
('Huile essentielle Orange douce', 'citrus sinensis oil', ARRAY['HE orange'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Très douce. Safe en diffusion + dilution cutanée. Légère photosensibilisation.', 'CRAT, Aromathérapie médicale', NULL),
('Huile essentielle Lavande aspic', 'lavandula latifolia oil', ARRAY['HE lavande aspic'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Plus camphrée que lavande vraie. Préférer lavande vraie en grossesse.', 'Aromathérapie médicale', NULL),

-- ━━━ SAFE (à dose normale, dilution recommandée) ━━━
('Huile essentielle Lavande vraie', 'lavandula angustifolia oil', ARRAY['HE lavande vraie', 'lavende fine'], 'cosmetic', 'caution', 'safe', 'safe', 'safe', 'Évitée T1 par principe, safe T2-T3 en dilution cutanée modérée + diffusion. Apaisante.', 'CRAT, Aromathérapie médicale', NULL),
('Huile essentielle Camomille noble', 'chamaemelum nobile oil', ARRAY['HE camomille romaine'], 'cosmetic', 'caution', 'safe', 'safe', 'safe', 'Antispasmodique. Évitée T1 par précaution. Safe T2-T3 en dilution.', 'Aromathérapie médicale', NULL),
('Huile essentielle Mandarine', 'citrus reticulata oil', ARRAY['HE mandarine'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Très douce. Safe en diffusion + dilution cutanée. Apaisante.', 'CRAT', NULL),
('Huile essentielle Ylang-Ylang', 'cananga odorata oil', ARRAY['HE ylang-ylang'], 'cosmetic', 'caution', 'caution', 'safe', 'safe', 'Très puissante en parfum. À diluer fortement. Safe T3.', 'Aromathérapie médicale', NULL),
('Huile essentielle Bois de rose', 'aniba rosaeodora oil', ARRAY['HE bois de rose'], 'cosmetic', 'caution', 'safe', 'safe', 'safe', 'Linalol majoritaire. Safe T2-T3 en dilution.', 'Aromathérapie médicale', NULL),
('Huile essentielle Géranium rosat', 'pelargonium graveolens oil', ARRAY['HE géranium rosat'], 'cosmetic', 'caution', 'caution', 'safe', 'safe', 'Évitée T1 par précaution. Safe T2-T3 modéré.', 'Aromathérapie médicale', NULL),
('Huile essentielle Petitgrain bigarade', 'citrus aurantium leaf oil', ARRAY['HE petitgrain'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Très douce. Apaisante, anti-stress. Safe.', 'Aromathérapie médicale', NULL),
('Huile essentielle Néroli', 'citrus aurantium amara flower oil', ARRAY['HE néroli'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Fleur d''oranger amer. Safe, très apaisante.', 'CRAT', NULL),
('Huile essentielle Rose de Damas', 'rosa damascena oil', ARRAY['HE rose'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Précieuse, douce. Safe en grossesse en faible quantité (parfum + soin).', 'Aromathérapie médicale', NULL),
('Huile essentielle Ravintsara', 'cinnamomum camphora ct cineole oil', ARRAY['HE ravintsara'], 'cosmetic', 'caution', 'safe', 'safe', 'safe', 'Antiviral très utilisé. Évitée T1 (cinéole), safe T2-T3.', 'Aromathérapie médicale', NULL),

-- ━━━ HYDROLATS (eaux florales, doses très diluées, généralement safe) ━━━
('Hydrolat de Rose', 'rosa damascena water', ARRAY['eau florale de rose'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Eau florale de rose. Safe en grossesse + allaitement.', 'Aromathérapie médicale', NULL),
('Hydrolat de Fleur d''Oranger', 'citrus aurantium amara flower water', ARRAY['eau de fleur d''oranger', 'néroli hydrolat'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Safe en grossesse. Apaisante, peut être bue.', 'CRAT', NULL),
('Hydrolat de Bleuet', 'centaurea cyanus water', ARRAY['eau florale bleuet'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Décongestionnant ophtalmique. Safe.', 'Aromathérapie médicale', NULL),
('Hydrolat de Camomille', 'chamaemelum nobile water', ARRAY['eau florale camomille'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Apaisant, anti-inflammatoire doux. Safe grossesse + bébé.', 'CRAT', NULL),
('Hydrolat de Lavande', 'lavandula angustifolia water', ARRAY['eau florale lavande'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Très diluée. Safe en grossesse + soin bébé.', 'Aromathérapie médicale', NULL),
('Hydrolat de Géranium', 'pelargonium graveolens water', ARRAY['eau florale géranium'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Safe. Anti-inflammatoire doux.', 'Aromathérapie médicale', NULL),
('Hydrolat de Tilleul', 'tilia cordata water', ARRAY['eau florale tilleul'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Apaisant. Safe.', 'Aromathérapie médicale', NULL),
('Hydrolat de Verveine citronnée', 'aloysia citrodora water', ARRAY['eau florale verveine'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Plus dilué que l''HE, safe.', 'Aromathérapie médicale', NULL),
('Hydrolat d''Hamamélis', 'hamamelis virginiana water', ARRAY['eau florale hamamélis'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Astringent doux. Safe.', 'Aromathérapie médicale', NULL),
('Hydrolat de Menthe poivrée', 'mentha piperita water', ARRAY['eau florale menthe poivrée'], 'cosmetic', 'caution', 'caution', 'caution', 'caution', 'À éviter par précaution (même si très dilué).', 'Aromathérapie médicale', NULL),

-- ━━━ HUILES VÉGÉTALES (porteuses, généralement safe) ━━━
('Huile végétale d''Amande douce', 'prunus amygdalus dulcis oil', ARRAY['huile amande douce'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Huile porteuse classique. Safe pour vergetures.', 'Cosing', NULL),
('Huile végétale d''Argan', 'argania spinosa oil', ARRAY['huile argan'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Anti-vergetures. Safe.', 'Cosing', NULL),
('Huile végétale de Coco', 'cocos nucifera oil', ARRAY['huile coco'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Hydratante. Safe pour vergetures + bébé.', 'Cosing', NULL),
('Huile végétale d''Avocat', 'persea gratissima oil', ARRAY['huile avocat'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Nourrissante. Safe.', 'Cosing', NULL),
('Huile végétale de Rose musquée', 'rosa moschata oil', ARRAY['huile rose musquée'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Anti-vergetures réputée. Safe.', 'Cosing', NULL),
('Huile végétale de Bourrache', 'borago officinalis oil', ARRAY['huile bourrache'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Topique safe (vs racine ou tisane à éviter).', 'CRAT', NULL),
('Huile végétale de Calendula', 'calendula officinalis oil', ARRAY['huile calendula'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Apaisante. Safe en application topique.', 'Cosing', NULL),
('Huile végétale d''Onagre', 'oenothera biennis oil', ARRAY['huile onagre'], 'cosmetic', 'caution', 'caution', 'caution', 'safe', 'Topique : prudence. Oral : à éviter.', 'Aromathérapie médicale', NULL),
('Huile végétale de Pépins de raisin', 'vitis vinifera seed oil', ARRAY['huile pépins de raisin'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Safe. Légère, anti-oxydante.', 'Cosing', NULL),
('Huile végétale de Jojoba', 'simmondsia chinensis oil', ARRAY['huile jojoba'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Régulatrice sébum. Safe.', 'Cosing', NULL),
('Huile végétale de Karité', 'butyrospermum parkii butter', ARRAY['beurre de karité'], 'cosmetic', 'safe', 'safe', 'safe', 'safe', 'Excellent anti-vergetures. Safe.', 'Cosing', NULL)

ON CONFLICT (name_inci) DO NOTHING;
