-- Hēlo — Produits seed data
-- 20 produits : 10 cosmétiques + 10 alimentaires
-- Requires schema.sql + seed-ingredients.sql first

-- ============================================================
-- COSMÉTIQUES (10)
-- ============================================================
INSERT INTO products (name, brand, category, barcode, description_fr, ingredient_ids, overall_risk)
VALUES

(
  'Crème Soft',
  'NIVEA',
  'cosmetic',
  '4005808222919',
  'Crème corps et mains nourrissante classique. Formule à base de glycérine et d''huile d''amande douce. Sans rétinol ni AINS. Bien tolérée en usage courant pendant la grossesse.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci IN ('Glycolic Acid')),
  'safe'
),

(
  'Gel Lavant Bébé',
  'MUSTELA',
  'cosmetic',
  '3504105034046',
  'Gel lavant très doux spécialement conçu pour les peaux sensibles de bébé. Sans parfum, sans colorant, sans parabènes. Formulé pour les mamans et les nourrissons. La formule Mustela est l''une des plus douces du marché.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Sensibio H2O',
  'BIODERMA',
  'cosmetic',
  '3401599000353',
  'Eau micellaire démaquillante pour peaux sensibles, sans rinçage. Formule douce, sans alcool, sans parabènes. L''une des eaux micellaires les mieux tolérées. Aucun ingrédient problématique identifié pour la grossesse à l''usage normal.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Solution Micellaire Eau de Rose',
  'GARNIER',
  'cosmetic',
  '3600542099844',
  'Eau micellaire à l''extrait de rose pour peau sensible. Formula douce sans parabènes. Contient de l''eau de rose et de la glycérine. Convient bien pendant la grossesse. Évitez le contact prolongé avec les yeux.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Crème Visage Sensitive',
  'MIXA',
  'cosmetic',
  '3600520981306',
  'Crème hydratante pour peaux sensibles à l''urée et au carbonate de calcium. Sans parabènes. Formule testée sous contrôle dermatologique. Bien adaptée aux peaux sensibles de la grossesse (qui peuvent être plus réactives).',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Huile Prodigieuse',
  'NUXE',
  'cosmetic',
  '3264680009168',
  'Huile sèche multi-usage pour visage, corps et cheveux. Contient des huiles végétales précieuses et des huiles essentielles (rose, santal, neroli). La présence d''huiles essentielles invite à la prudence : l''utilisation localisée et modérée reste acceptable mais évitez les grandes surfaces. Préférez la version sans parfum si disponible.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Eucalyptol'),
  'caution'
),

(
  'Effaclar Gel Moussant',
  'LA ROCHE-POSAY',
  'cosmetic',
  '3337872413446',
  'Gel nettoyant pour peaux grasses et à imperfections. Contient du zinc et du piroctone olamine. Attention : certaines formules Effaclar contiennent de l''acide salicylique (BHA). Vérifiez l''étiquette : si la version que vous utilisez contient de l''acide salicylique, limitez l''usage à des applications localisées et peu fréquentes.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Salicylic Acid'),
  'caution'
),

(
  'Shampooing Extra-Doux Calendula',
  'KLORANE',
  'cosmetic',
  '3282779325004',
  'Shampooing doux à l''extrait de calendula pour cheveux fragiles et sensibles. Sans silicones lourds, sans colorants. Formule douce et bien tolérée. Peut être utilisé pendant la grossesse sans contrainte particulière. La formule est conçue pour les cuirs chevelus sensibles.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Gel Douche Soin Hydratant',
  'DOVE',
  'cosmetic',
  '8717163552117',
  'Gel douche crémeux hydratant enrichi en agents hydratants. Sans savon dur. Formule douce qui respecte le film hydrolipidique. Aucun ingrédient problématique identifié pour la grossesse. Convient tout au long de la grossesse.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Elsève Extraordinary Oil Shampooing',
  'L''ORÉAL PARIS',
  'cosmetic',
  '3600523502639',
  'Shampooing à base d''huiles précieuses pour cheveux secs. Contient des agents de conservation standards et des extraits d''huiles végétales. La formule ne contient pas de rétinol ni d''ingrédients hautement problématiques. Utilisation normale compatible avec la grossesse.',
  ARRAY[]::UUID[],
  'safe'
);

-- ============================================================
-- ALIMENTATION (10)
-- ============================================================
INSERT INTO products (name, brand, category, barcode, description_fr, ingredient_ids, overall_risk)
VALUES

(
  'Camembert de Normandie au Lait Cru AOP',
  'PRÉSIDENT',
  'food',
  '3228020070003',
  'Camembert fabriqué au lait cru de vache non pasteurisé, appellation AOP protégée. À éviter pendant la grossesse en raison du risque de Listeria monocytogenes. Préférez le Camembert Président pasteurisé (en emballage standard, mention "au lait thermisé"). Les fromages à pâte cuite type emmental ou comté restent sans restriction.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Raw milk cheese'),
  'danger'
),

(
  'Jambon Supérieur Cuit',
  'FLEURY MICHON',
  'food',
  '3297341600009',
  'Jambon de porc cuit, tranché sous vide. Le jambon cuit pasteurisé et emballé sous vide est sans risque de listériose. C''est l''un des aliments protéinés les plus sûrs et pratiques pendant la grossesse. Consommez avant la DLC indiquée et gardez au réfrigérateur.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Saumon Atlantique Fumé',
  'LABEYRIE',
  'food',
  '3057640133606',
  'Saumon de l''Atlantique fumé à froid, tranché. Le saumon fumé à froid n''est pas cuit et présente un faible risque de Listeria monocytogenes. Consommez-le impérativement avant la DLC, vérifiez que l''emballage est intact. Par précaution, préférez le saumon cuit pendant la grossesse. Si vous en consommez, une fois par semaine au maximum.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Smoked salmon'),
  'caution'
),

(
  'Thon Entier au Naturel',
  'PETIT NAVIRE',
  'food',
  '3261060007607',
  'Thon albacore entier en boîte, conservé au naturel (eau et sel). Le thon en conserve contient moins de mercure que le thon frais. Limiter à 1-2 portions par semaine (1 boîte moyenne). Il reste une excellente source de protéines et d''oméga-3 à consommer en quantité raisonnée.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Canned tuna'),
  'caution'
),

(
  'Rillettes de Porc du Mans',
  'BORDEAU CHESNEL',
  'food',
  '3560070976102',
  'Rillettes de porc pur, cuites et stérilisées en boîte. La stérilisation élimine les risques bactériens. En boîte hermétique non ouverte, le risque de contamination est nul. Une fois ouverte, conservez au réfrigérateur et consommez rapidement. Attention à la teneur élevée en sel et en graisses saturées.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Yaourt Nature au Lait Entier',
  'DANONE',
  'food',
  '3033490008773',
  'Yaourt nature au lait entier pasteurisé. Les yaourts au lait pasteurisé sont totalement sans risque pendant la grossesse. Excellente source de calcium et de protéines essentiels au développement osseux du bébé. À consommer sans modération dans le cadre d''une alimentation équilibrée.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Café Expresso Classique',
  'NESCAFÉ',
  'food',
  '7613032338886',
  'Café soluble arôme intense. Attention : la caféine est à surveiller pendant la grossesse. Un café soluble standard contient environ 60-80 mg de caféine par tasse. La limite recommandée par l''OMS est de 200 mg/jour, soit environ 2-3 tasses selon la préparation. Comptez aussi la caféine du thé, du chocolat et des sodas.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Caffeine'),
  'caution'
),

(
  'Œufs Frais Plein Air Label Rouge',
  'LES FERMIERS DE LOUÉ',
  'food',
  '3274080007603',
  'Œufs de poules élevées en plein air, classés A+. Les œufs bien cuits sont une excellente source de protéines, de fer et de choline pour le développement cérébral du bébé. Évitez de les consommer crus ou peu cuits (à la coque, mollets) — préférez les œufs durs ou brouillés bien cuits. Conservez au réfrigérateur.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Raw eggs'),
  'caution'
),

(
  'Lait Entier Pasteurisé Bio',
  'BIOCOOP',
  'food',
  '3329482001234',
  'Lait entier de vaches élevées en bio, pasteurisé. Le lait pasteurisé est parfaitement sûr pendant la grossesse, contrairement au lait cru. Excellent apport en calcium (environ 120 mg par 100ml), en protéines et en vitamine D. À consommer au quotidien dans le cadre d''une alimentation équilibrée.',
  ARRAY[]::UUID[],
  'safe'
),

(
  'Foie de Veau Provençale',
  'SODEBO',
  'food',
  '3302744009982',
  'Préparation culinaire à base de foie de veau cuisiné. Le foie de veau est extrêmement riche en vitamine A (rétinol) : une portion peut dépasser de plusieurs fois la limite de sécurité recommandée pendant la grossesse. Un excès de vitamine A est tératogène. Évitez toute préparation à base de foie d''animal pendant la grossesse.',
  ARRAY(SELECT id FROM ingredients WHERE name_inci = 'Liver'),
  'danger'
);
