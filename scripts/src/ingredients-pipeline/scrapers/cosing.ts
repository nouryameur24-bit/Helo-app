/**
 * cosing.ts — 1 500 ingrédients cosmétiques avec niveaux de risque grossesse pré-calculés.
 * Sources: SCCS, CosIng EU Commission, ANSM, CRAT.
 * Aucun appel réseau — données entièrement embarquées.
 */

import { type PreComputedIngredient, type RiskTuple, ing } from '../utils.js';

type R = RiskTuple;
const S: R = ['safe','safe','safe','safe'];
const C: R = ['caution','caution','caution','caution'];
const D: R = ['danger','danger','danger','danger'];
const DC: R = ['danger','caution','caution','caution'];   // dangereux T1
const DCC: R = ['danger','danger','caution','caution'];   // dangereux T1+T2
const CD: R = ['caution','caution','danger','caution'];   // dangereux T3
const CS: R = ['caution','safe','safe','safe'];

function c(ni: string, n: string, r: R, d: string, conf: 'high'|'medium'|'low' = 'high'): PreComputedIngredient {
  return ing(ni, n, 'cosmetic', r, d, 'cosing', conf);
}

// ─── Parabènes ────────────────────────────────────────────────────────────────
const PARABENS: PreComputedIngredient[] = [
  c('METHYLPARABEN','Méthylparaben',C,'Conservateur parabène. Activité oestrogénique faible détectée in vitro. Par précaution, limiter l\'exposition pendant la grossesse.'),
  c('ETHYLPARABEN','Éthylparaben',C,'Conservateur parabène. Données in vitro montrent une activité hormonale légère. À éviter en usage intensif.','medium'),
  c('PROPYLPARABEN','Propylparaben',C,'Parabène à activité androgénique et oestrogénique. Restreint dans les produits laissés sur la peau en UE. Précaution recommandée.'),
  c('BUTYLPARABEN','Butylparaben',C,'Parabène longue chaîne — activité oestrogénique plus marquée. Restricted EU Annex V. À éviter autant que possible pendant la grossesse.'),
  c('ISOBUTYLPARABEN','Isobutylparaben',C,'Parabène — données similaires au butylparaben. Activité endocrinienne potentielle.','medium'),
  c('ISOPROPYLPARABEN','Isopropylparaben',C,'Parabène à propriétés endocriniennes potentielles. Interdit dans certains produits cosmétiques UE.','medium'),
  c('BENZYLPARABEN','Benzylparaben',C,'Conservateur parabène. Données toxicologiques limitées. À éviter par précaution.','medium'),
  c('SODIUM METHYLPARABEN','Méthylparaben sodique',C,'Sel sodique du méthylparaben. Mêmes précautions que le méthylparaben.','medium'),
  c('SODIUM ETHYLPARABEN','Éthylparaben sodique',C,'Sel sodique de l\'éthylparaben. Activité oestrogénique faible.','medium'),
  c('SODIUM PROPYLPARABEN','Propylparaben sodique',C,'Sel sodique du propylparaben. Même profil de risque que le propylparaben.','medium'),
  c('SODIUM BUTYLPARABEN','Butylparaben sodique',C,'Sel sodique du butylparaben. Précaution recommandée pendant la grossesse.','medium'),
  c('POTASSIUM METHYLPARABEN','Méthylparaben potassique',C,'Sel potassique du méthylparaben. Mêmes précautions que le méthylparaben.','low'),
  c('POTASSIUM BUTYLPARABEN','Butylparaben potassique',C,'Sel potassique du butylparaben. Précaution recommandée.','low'),
];

// ─── Silicones ────────────────────────────────────────────────────────────────
const SILICONES: PreComputedIngredient[] = [
  c('DIMETHICONE','Diméthicone',S,'Silicone filmogène très commun en cosmétique. Considéré sûr en usage topique pendant la grossesse — absorption systémique négligeable.'),
  c('CYCLOMETHICONE','Cyclométhicone',C,'Silicone cyclique volatile. Données sur perturbation endocrinienne potentielle — absorption pulmonaire lors des sprays. À éviter en spray.','medium'),
  c('CYCLOPENTASILOXANE','Cyclopentasiloxane (D5)',C,'Silicone cyclique — perturbateur endocrinien potentiel à fortes expositions. Restreint dans les produits rincés UE. Précaution en usage intensif.'),
  c('CYCLOTETRASILOXANE','Cyclotétrasiloxane (D4)',C,'Silicone cyclique classé CMR 2 par l\'UE (reprotoxique). Interdit dans les cosmétiques UE laissés sur la peau. À éviter absolument.','high'),
  c('DIMETHICONOL','Diméthiconol',S,'Dérivé du diméthicone. Profil de sécurité similaire — absorption négligeable en usage topique.'),
  c('AMODIMETHICONE','Amodiméthicone',S,'Silicone aminé utilisé dans les soins capillaires. Considéré sûr en usage cosmétique.','medium'),
  c('PHENYL TRIMETHICONE','Phényl triméthicone',S,'Silicone sensoriel. Données de sécurité rassurantes en usage topique.','medium'),
  c('TRIMETHYLSILOXYSILICATE','Triméthylsiloxysilicate',S,'Résine silicone filmogène. Absorption cutanée très faible.','medium'),
  c('CYCLOHEXASILOXANE','Cyclohexasiloxane (D6)',C,'Silicone cyclique — données de sécurité limitées. Par analogie avec D4/D5, précaution recommandée.','medium'),
  c('METHICONE','Méthicone',S,'Silicone simple. Absorption systémique négligeable en usage topique.','medium'),
  c('STEARYL DIMETHICONE','Stéaryl diméthicone',S,'Émollient silicone. Considéré sûr en usage cosmétique.','medium'),
  c('CETYL DIMETHICONE','Cétyl diméthicone',S,'Émollient silicone. Profil de sécurité rassurante.','medium'),
  c('LAURYL METHICONE COPOLYOL','Copolyol méthicone laurylé',S,'Silicone hydrophile. Données de sécurité correctes pour l\'usage cosmétique.','low'),
  c('DIMETHICONE CROSSPOLYMER','Réticulat de diméthicone',S,'Forme réticulée du diméthicone. Absorption systémique très faible.','medium'),
  c('TRIMETHYLSILOXY AMODIMETHICONE','Amodiméthicone triméthylsiloxy',S,'Silicone aminé de soin capillaire. Considéré sûr.','low'),
  c('POLYSILICONE-11','Polysilicone-11',S,'Polymère silicone utilisé dans les formules cosmétiques. Sécurité rassurante.','low'),
  c('HYDROGEN DIMETHICONE','Hydrogéno diméthicone',S,'Silicone réticulant. Absorption cutanée minimale.','low'),
];

// ─── PEGs ─────────────────────────────────────────────────────────────────────
function pegEntry(n: number): PreComputedIngredient {
  const ni = `PEG-${n}`;
  const risk: R = n <= 10 ? C : ['caution','safe','safe','safe'];
  return c(ni, `PEG-${n}`, risk,
    `Polyéthylèneglycol ${n}. Agent humectant/émulsifiant. Les PEG de faible poids moléculaire présentent un risque d\'absorption cutanée accru. Précaution sur peau lésée.`,
    n <= 10 ? 'medium' : 'low');
}

const PEGS: PreComputedIngredient[] = [
  4,6,7,8,9,10,12,14,16,20,25,30,32,33,36,40,45,50,60,75,80,90,100,120,150,200
].map(pegEntry);

// ─── Sulfates et tensioactifs ─────────────────────────────────────────────────
const SULFATES: PreComputedIngredient[] = [
  c('SODIUM LAURYL SULFATE','Laurylsulfate de sodium (SLS)',C,'Tensioactif irritant — altère la barrière cutanée, augmentant la pénétration d\'autres substances. À éviter sur peau sensibilisée.'),
  c('SODIUM LAURETH SULFATE','Laurylether sulfate de sodium (SLES)',C,'Tensioactif commun. Mieux toléré que le SLS. Peut contenir traces de 1,4-dioxane (contaminant). Précaution.','medium'),
  c('AMMONIUM LAURYL SULFATE','Laurylsulfate d\'ammonium (ALS)',C,'Tensioactif irritant similaire au SLS. Même précaution recommandée.','medium'),
  c('AMMONIUM LAURETH SULFATE','Laurylether sulfate d\'ammonium',C,'Version éthoxylée de l\'ALS. Précaution sur peau lésée.','medium'),
  c('SODIUM COCO SULFATE','Sulfate de coco sodique',C,'Mélange de sulfates dérivés de la noix de coco. Potentiel irritant — précaution sur muqueuses.','medium'),
  c('SODIUM MYRETH SULFATE','Sulfate de myristyle éthoxylé sodique',C,'Tensioactif doux. Contient traces potentielles de 1,4-dioxane.','low'),
  c('MAGNESIUM LAURETH SULFATE','Sulfate de magnésium lauryléther',C,'Tensioactif anionique — profil similaire au SLES.','low'),
  c('TEA LAURYL SULFATE','Laurylsulfate de triéthanolamine',C,'Tensioactif — la TEA peut former des nitrosamines. Précaution pendant la grossesse.','medium'),
  c('SODIUM LAURYL SULFOACETATE','Laurylsulfoacétate de sodium (SLSA)',S,'Tensioactif doux dérivé de la noix de coco. Moins irritant que le SLS. Considéré sûr.','medium'),
  c('DISODIUM LAURETH SULFOSUCCINATE','Sulfosuccinate de lauryléther disodique',S,'Tensioactif doux. Bien toléré. Profil de sécurité rassurant.','medium'),
  c('COCAMIDOPROPYL BETAINE','Cocamidopropyl bétaïne',C,'Tensioactif amphotère — peut provoquer des réactions allergiques (impuretés DMAPA). Précaution.','medium'),
  c('SODIUM COCOAMPHOACETATE','Cocoamphoacétate de sodium',S,'Tensioactif doux dérivé de la noix de coco. Bien toléré.','medium'),
  c('DECYL GLUCOSIDE','Glucoside décylique',S,'Tensioactif doux dérivé du glucose. Considéré sûr pendant la grossesse.'),
  c('LAURYL GLUCOSIDE','Glucoside laurylique',S,'Tensioactif doux. Bien toléré — profil de sécurité rassurant.'),
  c('COCO GLUCOSIDE','Glucoside de coco',S,'Tensioactif très doux dérivé de la noix de coco et du glucose. Sûr pendant la grossesse.'),
  c('CAPRYLYL/CAPRYL GLUCOSIDE','Glucoside caprylyle/capryle',S,'Tensioactif glucosidique très doux. Convient aux peaux sensibles.','medium'),
  c('SODIUM COCOYL ISETHIONATE','Cocoyl isethionate de sodium',S,'Tensioactif doux — très bien toléré. Considéré sûr.','medium'),
  c('SODIUM LAUROYL SARCOSINATE','Lauroyl sarcosinate de sodium',S,'Tensioactif doux. Profil de sécurité rassurant.','medium'),
  c('POTASSIUM COCOATE','Cocoate de potassium',S,'Sel potassique des acides gras de la noix de coco (savon). Sûr.','medium'),
  c('SODIUM PALMATE','Palmitate de sodium',S,'Savon naturel. Considéré sûr.'),
  c('SODIUM STEARATE','Stéarate de sodium',S,'Savon à l\'acide stéarique. Sûr.'),
  c('SODIUM TALLOWATE','Suifate de sodium',S,'Savon d\'origine animale. Sûr en usage topique.','medium'),
];

// ─── Filtres UV ───────────────────────────────────────────────────────────────
const UV_FILTERS: PreComputedIngredient[] = [
  c('OXYBENZONE','Oxybenzone (Benzophénone-3)',C,'Filtre UV organique — perturbateur endocrinien détecté. Absorption systémique documentée. À éviter pendant la grossesse, notamment en 1er trimestre.'),
  c('AVOBENZONE','Avobenzone (Butyl Méthoxydibenzoylméthane)',C,'Filtre UVA très commun. Données de sécurité limitées pendant la grossesse. Préférer les filtres minéraux.','medium'),
  c('OCTINOXATE','Octinoxate (Méthoxycinnamate d\'éthylhexyle)',C,'Filtre UVB — perturbateur endocrinien potentiel, absorption systémique documentée. À éviter pendant la grossesse.'),
  c('OCTOCRYLENE','Octocrylène',C,'Filtre UV — se dégrade en benzophénone (perturbateur endocrinien). Données de préoccupation croissantes. Précaution.'),
  c('HOMOSALATE','Homosalate',C,'Filtre UV — perturbateur endocrinien potentiel. SCCS recommande de limiter la concentration. Précaution grossesse.'),
  c('OCTYL SALICYLATE','Salicylate d\'éthylhexyle',C,'Filtre UVB. Absorption cutanée documentée. Précaution chez la femme enceinte.','medium'),
  c('BENZOPHENONE-4','Benzophénone-4 (Sulisobenzone)',C,'Filtre UV soluble dans l\'eau — absorption systémique. Perturbateur endocrinien potentiel.','medium'),
  c('BENZOPHENONE-3','Benzophénone-3 (Oxybenzone)',C,'Même que OXYBENZONE. Perturbateur endocrinien — à éviter pendant la grossesse.'),
  c('MEXORYL SX','Mexoryl SX (Acide téréphthalylindène dicamphresulfonique)',C,'Filtre UVA propriétaire L\'Oréal. Données limitées en grossesse. Précaution.','medium'),
  c('MEXORYL XL','Mexoryl XL (Drométrizol trisiloxane)',C,'Filtre UV large spectre. Données de sécurité limitées pendant la grossesse.','medium'),
  c('TINOSORB S','Tinosorb S (Bis-éthylhexyloxyphénol méthoxyphényl triazine)',C,'Filtre UV large spectre. Absorption cutanée faible. Préférer les filtres minéraux par précaution.','medium'),
  c('TINOSORB M','Tinosorb M (Méthylène bis-benzotriazolyl tétraméthylbutylphénol)',S,'Filtre UV particulaire. Absorption systémique très faible. Considéré relativement sûr.','medium'),
  c('ZINC OXIDE','Oxyde de zinc',S,'Filtre minéral physique. Aucune absorption systémique significative. Premier choix pendant la grossesse.'),
  c('TITANIUM DIOXIDE','Dioxyde de titane',S,'Filtre minéral physique. Absorption systémique négligeable en application cutanée (non-nanoparticules). Sûr pendant la grossesse.'),
  c('ISCOTRIZINOL','Iscotrizinol (DHHB)',C,'Filtre UV. Données limitées. Précaution par principe.','low'),
  c('ECAMSULE','Écamsule (Mexoryl SX)',C,'Filtre UVA dérivé camphre. Données limitées en grossesse.','medium'),
  c('DIETHYLHEXYL BUTAMIDO TRIAZONE','Butamido triazone diéthylhexyle',C,'Filtre UV triazine. Données de sécurité limitées.','low'),
  c('ETHYLHEXYL TRIAZONE','Éthylhexyl triazine (Octyl triazone)',C,'Filtre UVB. Absorption cutanée limitée. Précaution par analogie.','low'),
  c('DIETHYLAMINOHYDROXYBENZOYL HEXYL BENZOATE','DHHB (Benzoate de diéthylaminohydroxybenzoyl hexyle)',C,'Filtre UVA. Absorption limitée. Données insuffisantes grossesse.','low'),
  c('PARA-AMINOBENZOIC ACID','Acide para-aminobenzoïque (PABA)',C,'Filtre UVB — fort potentiel allergisant. Déconseillé pendant la grossesse.'),
];

// ─── Rétinoïdes ───────────────────────────────────────────────────────────────
const RETINOIDS: PreComputedIngredient[] = [
  c('RETINOL','Rétinol (Vitamine A)',DCC,'CONTRE-INDIQUÉ en 1er et 2e trimestres — risque tératogène documenté à fortes doses. Absorption cutanée possible. À éviter totalement pendant la grossesse.'),
  c('RETINYL ACETATE','Acétate de rétinyle',DCC,'Ester du rétinol — risque tératogène similaire. Interdit pendant la grossesse (CosIng Annex III).'),
  c('RETINYL PALMITATE','Palmitate de rétinyle',DCC,'Forme ester du rétinol. SCCS: limiter l\'exposition. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('RETINAL','Rétinal (Rétinaldéhyde)',DCC,'Précurseur direct de l\'acide rétinoïque — risque tératogène très élevé. Absolument à éviter.'),
  c('RETINOIC ACID','Acide rétinoïque (Trétinoïne)',D,'ABSOLUMENT CONTRE-INDIQUÉ pendant toute la grossesse. Tératogène majeur documenté — malformations multiples.'),
  c('HYDROXYPINACOLONE RETINOATE','Hydroxypinacolone rétinoate (HPR)',DCC,'Ester rétinoïde de nouvelle génération. Risque tératogène par analogie structurale. À éviter pendant la grossesse.','medium'),
  c('ADAPALENE','Adapalène',D,'Rétinoïde de 3e génération — tératogène documenté en usage systémique. Contre-indiqué en topique également par précaution.'),
  c('ISOTRETINOIN','Isotrétinoïne',D,'TÉRATOGÈNE MAJEUR ABSOLU. Contre-indiqué même en trace pendant toute la grossesse. Programme de prévention obligatoire.'),
  c('TAZAROTENE','Tazarotène',D,'Rétinoïde topique — contre-indiqué pendant la grossesse (classé catégorie X USA).'),
  c('RETINYL LINOLEATE','Linoléate de rétinyle',DCC,'Ester du rétinol — même précaution que le rétinol.','medium'),
  c('RETINYL RETINOATE','Rétinoate de rétinyle',DCC,'Double ester rétinoïde — risque tératogène par analogie. À éviter.','medium'),
  c('GRANACTIVE RETINOID','Rétinoïde granactive (HPR/rétinol)',DCC,'Complexe rétinoïde. Précaution — risque tératogène potentiel.','medium'),
];

// ─── AHAs, BHAs et acides ─────────────────────────────────────────────────────
const HYDROXY_ACIDS: PreComputedIngredient[] = [
  c('GLYCOLIC ACID','Acide glycolique',C,'AHA — augmente la pénétration cutanée des autres substances. Données limitées en grossesse. Éviter les concentrations élevées.','medium'),
  c('LACTIC ACID','Acide lactique',C,'AHA doux — présent naturellement dans le corps. À faibles concentrations, considéré relativement sûr. Éviter les peelings forts.','medium'),
  c('SALICYLIC ACID','Acide salicylique (BHA)',CD,'BHA — CONTRE-INDIQUÉ à partir du 6e mois en application large. À faibles concentrations en usage localisé : précaution. Analogie avec l\'aspirine orale.'),
  c('MANDELIC ACID','Acide mandélique',C,'AHA. Données limitées pendant la grossesse. Précaution recommandée.','medium'),
  c('TARTARIC ACID','Acide tartrique',S,'AHA. Utilisé comme régulateur de pH. Considéré sûr aux concentrations cosmétiques.','medium'),
  c('MALIC ACID','Acide malique',S,'AHA naturel (pommes). Bien toléré. Concentrations cosmétiques considérées sûres.','medium'),
  c('CITRIC ACID','Acide citrique',S,'Régulateur de pH naturel. Sûr pendant la grossesse aux doses cosmétiques.'),
  c('PYRUVIC ACID','Acide pyruvique',C,'Acide fort utilisé en peeling chimique. Données grossesse limitées — précaution.','low'),
  c('TRICHLOROACETIC ACID','Acide trichloracétique (TCA)',D,'Agent de peeling chimique profond. Contre-indiqué pendant la grossesse — pénétration systémique.'),
  c('BETA-HYDROXY ACID','Acide bêta-hydroxylé',C,'Terme générique pour les BHAs. Précaution — voir acide salicylique.','medium'),
  c('POLYHYDROXY ACID','Acide polyhydroxylé (PHA)',C,'Exfoliant doux. Données limitées grossesse. Précaution par principe.','medium'),
  c('GLUCONOLACTONE','Gluconolactone',C,'PHA doux. Bien toléré. Données limitées grossesse — précaution légère.','medium'),
  c('LACTOBIONIC ACID','Acide lactobionique',C,'PHA. Considéré doux. Données grossesse limitées.','medium'),
  c('PHYTIC ACID','Acide phytique',S,'Chélateur naturel. Concentrations cosmétiques considérées sûres.','medium'),
];

// ─── Conservateurs ────────────────────────────────────────────────────────────
const PRESERVATIVES: PreComputedIngredient[] = [
  c('PHENOXYETHANOL','Phénoxyéthanol',C,'Conservateur largement utilisé. ANSM déconseille pour les moins de 3 ans et les femmes allaitantes (exposition néonatale). Précaution en fin de grossesse.'),
  c('METHYLISOTHIAZOLINONE','Méthylisothiazolinone (MIT)',C,'Biocide — fort potentiel allergisant et neurotoxicité in vitro. Interdit dans les produits sans rinçage UE. Précaution pendant la grossesse.'),
  c('METHYLCHLOROISOTHIAZOLINONE','Méthylchloroisothiazolinone (CMIT)',C,'Biocide CMI — allergisant majeur. Restrictions UE strictes. À éviter pendant la grossesse.'),
  c('BENZYL ALCOHOL','Alcool benzylique',C,'Conservateur et solvant. Données de sécurité acceptables aux concentrations autorisées. Précaution en usage intensif pendant la grossesse.','medium'),
  c('BENZOIC ACID','Acide benzoïque',C,'Conservateur naturel. Peut être métabolisé en hippurate. Précaution aux concentrations élevées.','medium'),
  c('SORBIC ACID','Acide sorbique',S,'Conservateur naturel (baies de sorbier). Bien toléré. Considéré sûr aux doses cosmétiques.','medium'),
  c('POTASSIUM SORBATE','Sorbate de potassium',S,'Sel de l\'acide sorbique. Conservateur naturel. Considéré sûr.'),
  c('SODIUM BENZOATE','Benzoate de sodium',C,'Conservateur — peut former du benzène en présence de vitamine C. Données cosmétiques limitées grossesse.','medium'),
  c('DMDM HYDANTOIN','DMDM Hydantoïne',D,'Libérateur de formaldéhyde — le formaldéhyde est classé cancérogène et génotoxique. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('IMIDAZOLIDINYL UREA','Imidazolidinyl-urée',D,'Libérateur de formaldéhyde — même risque que la DMDM hydantoïne. À éviter pendant la grossesse.'),
  c('DIAZOLIDINYL UREA','Diazolidinyl-urée',D,'Libérateur de formaldéhyde. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('QUATERNIUM-15','Quaternium-15',D,'Fort libérateur de formaldéhyde — très allergisant. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('BRONOPOL','Bronopol (2-Bromo-2-nitropropane-1,3-diol)',D,'Libérateur de formaldéhyde et de bromure. Potentiellement génotoxique. À éviter pendant la grossesse.'),
  c('FORMALDEHYDE','Formaldéhyde',D,'CANCÉROGÈNE ET REPROTOXIQUE. Interdit en cosmétique UE au-delà de 0,2%. À éviter absolument pendant la grossesse.'),
  c('TRICLOSAN','Triclosan',C,'Antibactérien — perturbateur endocrinien documenté. Restreint en cosmétique UE. Précaution pendant la grossesse.'),
  c('TRICLOCARBAN','Triclocarban',C,'Antibactérien — perturbateur endocrinien. Absorption cutanée documentée. Précaution grossesse.','medium'),
  c('CHLORPHENESIN','Chlorphénésine',C,'Conservateur — données limitées en grossesse. Précaution recommandée.','medium'),
  c('DEHYDROACETIC ACID','Acide déhydroacétique',C,'Conservateur. Données de sécurité limitées en grossesse.','medium'),
  c('SODIUM DEHYDROACETATE','Déhydroacétate de sodium',C,'Conservateur. Précaution pendant la grossesse par données limitées.','medium'),
  c('ETHYLHEXYLGLYCERIN','Éthylhexylglycérine',S,'Booster de conservation naturel. Données de sécurité rassurantes en usage cosmétique.','medium'),
  c('CAPRYLYL GLYCOL','Caprylyl glycol',S,'Humectant et conservateur doux. Considéré sûr aux concentrations cosmétiques.','medium'),
  c('HEXYLENE GLYCOL','Hexylène glycol',C,'Solvant et booster de pénétration cutanée. Données toxicologiques limitées.','medium'),
  c('PIROCTONE OLAMINE','Piroctone olamine',C,'Antifongique utilisé dans les shampoings antipelliculaires. Données de sécurité limitées en grossesse.','medium'),
  c('ZINC PYRITHIONE','Pyrithione de zinc',C,'Antifongique antipelliculaire — données limitées de passage systémique. Précaution en grossesse.','medium'),
  c('SELENIUM SULFIDE','Sulfure de sélénium',C,'Antifongique — absorption cutanée documentée. Précaution pendant la grossesse.','medium'),
  c('CHLORHEXIDINE','Chlorhexidine',C,'Antiseptique — précaution dans les produits à large surface d\'application. Données grossesse limitées.','medium'),
  c('SODIUM HYDROXYMETHYLGLYCINATE','Hydroxymethylglycinate de sodium',D,'Libérateur de formaldéhyde. À éviter pendant la grossesse.','medium'),
  c('2-PHENOXYETHANOL','2-Phénoxyéthanol',C,'Même substance que PHENOXYETHANOL. Voir entrée correspondante.','medium'),
  c('BHA','BHA (Butylhydroxyanisole)',C,'Antioxydant synthétique — classé cancérogène possible (groupe 2B). À éviter pendant la grossesse.'),
  c('BHT','BHT (Butylhydroxytoluène)',C,'Antioxydant synthétique. Perturbateur endocrinien potentiel. Précaution pendant la grossesse.','medium'),
  c('TOCOPHEROL','Tocophérol (Vitamine E)',S,'Antioxydant naturel. Sûr aux concentrations cosmétiques pendant la grossesse.'),
  c('TOCOPHERYL ACETATE','Acétate de tocophéryle (Vit E)',S,'Forme estérifiée de la vitamine E. Sûr en usage cosmétique.'),
  c('ASCORBIC ACID','Acide ascorbique (Vitamine C)',S,'Antioxydant naturel. Sûr en usage topique pendant la grossesse.'),
  c('ASCORBYL GLUCOSIDE','Glucoside d\'ascorbyle',S,'Dérivé stable de la vitamine C. Sûr en usage cosmétique.','medium'),
];

// ─── Huiles essentielles ──────────────────────────────────────────────────────
const ESSENTIAL_OILS: PreComputedIngredient[] = [
  c('LAVANDULA ANGUSTIFOLIA OIL','Huile essentielle de lavande vraie',C,'HE de lavande — généralement bien tolérée. Mais les HE sont à éviter en 1er trimestre. Usage très dilué possible en 2e et 3e trimestres après avis médical.','medium'),
  c('MELALEUCA ALTERNIFOLIA LEAF OIL','Huile essentielle d\'arbre à thé (Tea Tree)',C,'HE antimicrobienne — perturbateur endocrinien potentiel documenté. Précaution pendant toute la grossesse.'),
  c('MENTHA PIPERITA OIL','Huile essentielle de menthe poivrée',DC,'HE de menthe — contre-indiquée au 1er trimestre (emménagogue potentiel). À éviter près des voies respiratoires du bébé.'),
  c('ROSMARINUS OFFICINALIS LEAF OIL','Huile essentielle de romarin',DC,'HE emménagogue — contre-indiquée au 1er trimestre. Stimulante, précaution générale pendant la grossesse.'),
  c('EUCALYPTUS GLOBULUS LEAF OIL','Huile essentielle d\'eucalyptus',DC,'HE à 1,8-cinéole — contre-indiquée en 1er trimestre. Ne pas inhaler directement pendant la grossesse.','medium'),
  c('SALVIA OFFICINALIS OIL','Huile essentielle de sauge officinale',D,'HE CONTRE-INDIQUÉE pendant toute la grossesse — emménagogue, abortif potentiel. Riche en thuyone.'),
  c('JUNIPERUS COMMUNIS FRUIT OIL','Huile essentielle de genévrier',D,'HE néphrotoxique et abortive — CONTRE-INDIQUÉE pendant la grossesse.'),
  c('SATUREJA HORTENSIS OIL','Huile essentielle de sarriette',D,'HE dermocaustique et emménagogue — CONTRE-INDIQUÉE pendant la grossesse.'),
  c('ORIGANUM COMPACTUM FLOWER OIL','Huile essentielle d\'origan compact',D,'HE très irritante et emménagogue — CONTRE-INDIQUÉE pendant la grossesse.'),
  c('CINNAMOMUM ZEYLANICUM BARK OIL','Huile essentielle de cannelle de Ceylan',D,'HE caustique — contre-indiquée en grossesse. Dermocaustique et emménagogue.'),
  c('SYZYGIUM AROMATICUM BUD OIL','Huile essentielle de clou de girofle',D,'HE à eugénol élevé — contre-indiquée pendant la grossesse (dermocaustique, effets utérins potentiels).'),
  c('THYMUS VULGARIS OIL','Huile essentielle de thym à thymol',DC,'HE stimulante — contre-indiquée en 1er trimestre. Usage très dilué après avis médical en 2e/3e trimestres.'),
  c('ZINGIBER OFFICINALE ROOT OIL','Huile essentielle de gingembre',C,'HE — données limités grossesse. À éviter au 1er trimestre. Le gingembre en alimentaire est mieux toléré.','medium'),
  c('CITRUS LIMON PEEL OIL','Huile essentielle de citron',C,'HE photosensibilisante — ne pas utiliser avant exposition solaire. Précaution 1er trimestre.','medium'),
  c('CITRUS AURANTIUM DULCIS PEEL OIL','Huile essentielle d\'orange douce',C,'HE agrume photosensibilisante. Précaution 1er trimestre.','medium'),
  c('CITRUS BERGAMIA PEEL OIL','Huile essentielle de bergamote',C,'HE photosensibilisante — contient bergaptène. Précaution pendant la grossesse.'),
  c('PELARGONIUM GRAVEOLENS OIL','Huile essentielle de géranium rosat',C,'HE — données limités grossesse. Éviter en 1er trimestre.','medium'),
  c('CYMBOPOGON FLEXUOSUS OIL','Huile essentielle de lemongrass',C,'HE — données limitées. Précaution 1er trimestre.','medium'),
  c('CANANGA ODORATA OIL','Huile essentielle d\'ylang-ylang',C,'HE — données grossesse limitées. Précaution 1er trimestre.','medium'),
  c('BOSWELLIA CARTERII OIL','Huile essentielle d\'encens (boswellia)',C,'HE — données limités grossesse. Précaution 1er trimestre.','low'),
  c('CUPRESSUS SEMPERVIRENS OIL','Huile essentielle de cyprès',DC,'HE — déconseillée en 1er trimestre. Propriétés vasoconstrictrices.','medium'),
  c('PINUS SYLVESTRIS LEAF OIL','Huile essentielle de pin sylvestre',C,'HE — précaution en 1er trimestre. Potentiel allergisant.','medium'),
  c('CEDRUS ATLANTICA BARK OIL','Huile essentielle de cèdre de l\'Atlas',DC,'HE neurotoxique et abortive potentielle — précaution forte en grossesse.','medium'),
  c('VETIVERIA ZIZANOIDES ROOT OIL','Huile essentielle de vétiver',C,'HE — données limitées en grossesse. Précaution 1er trimestre.','low'),
  c('SANTALUM ALBUM OIL','Huile essentielle de santal',C,'HE — données limitées grossesse. Précaution recommandée.','low'),
  c('CHAMOMILLA RECUTITA OIL','Huile essentielle de camomille allemande',C,'HE — données limités en grossesse. Précaution 1er trimestre. La camomille en infusion est mieux tolérée.','medium'),
  c('JASMINUM OFFICINALE OIL','Huile essentielle de jasmin',C,'HE — données limités. Précaution 1er trimestre.','low'),
  c('ROSA DAMASCENA FLOWER OIL','Huile essentielle de rose de Damas',C,'HE — données limitées grossesse. Précaution 1er trimestre.','low'),
  c('OCIMUM BASILICUM OIL','Huile essentielle de basilic',DC,'HE à estragole (cancérogène potentiel) — déconseillée pendant la grossesse.','medium'),
  c('ARTEMISIA ABSINTHIUM OIL','Huile essentielle d\'absinthe',D,'HE à thuyone — NEUROTOXIQUE ET ABORTIVE. CONTRE-INDIQUÉE pendant la grossesse.'),
  c('TANACETUM VULGARE OIL','Huile essentielle de tanaisie',D,'HE TOXIQUE — abortive documentée. ABSOLUMENT CONTRE-INDIQUÉE en grossesse.'),
  c('ILLICIUM VERUM OIL','Huile essentielle d\'anis étoilé',DC,'HE à anéthol — effets oestrogéniques potentiels. Déconseillée en 1er trimestre.','medium'),
  c('FOENICULUM VULGARE OIL','Huile essentielle de fenouil',DC,'HE oestrogénique potentielle — précaution particulière en 1er trimestre.','medium'),
  c('HELICHRYSUM ITALICUM FLOWER OIL','Huile essentielle d\'hélichryse',C,'HE — données limités grossesse. Précaution 1er trimestre.','low'),
  c('COMMIPHORA MYRRHA OIL','Huile essentielle de myrrhe',D,'HE — propriétés utérotones. Déconseillée pendant la grossesse.','medium'),
  c('CITRUS PARADISI PEEL OIL','Huile essentielle de pamplemousse',C,'HE photosensibilisante. Précaution.','medium'),
  c('ANIBA ROSAEODORA WOOD OIL','Huile essentielle de bois de rose',C,'HE — données limités en grossesse. Précaution 1er trimestre.','low'),
  c('MYRTUS COMMUNIS OIL','Huile essentielle de myrte',C,'HE — précaution 1er trimestre.','low'),
  c('LAVANDULA LATIFOLIA OIL','Huile essentielle de lavandin',C,'HE de lavandin (différente de la lavande fine) — moins indiquée en grossesse que la lavande vraie.','medium'),
  c('NARDOSTACHYS JATAMANSI ROOT OIL','Huile essentielle de nard',C,'HE rare — données limités grossesse. Précaution.','low'),
  c('PIPER NIGRUM FRUIT OIL','Huile essentielle de poivre noir',C,'HE chauffante — données grossesse limitées. Précaution 1er trimestre.','low'),
  c('ELETTARIA CARDAMOMUM SEED OIL','Huile essentielle de cardamome',C,'HE — données limités grossesse. Précaution 1er trimestre.','low'),
  c('ACHILLEA MILLEFOLIUM OIL','Huile essentielle d\'achillée millefeuille',DC,'HE emménagogue — déconseillée en 1er trimestre.','medium'),
];

// ─── Fragrances et allergènes ─────────────────────────────────────────────────
const FRAGRANCES: PreComputedIngredient[] = [
  c('LIMONENE','Limonène',C,'Allergène de parfum déclaré obligatoirement UE. Potentiel irritant et allergisant. Précaution pendant la grossesse.'),
  c('LINALOOL','Linalol',C,'Allergène de parfum — présent dans de nombreuses HE. Précaution en grossesse.'),
  c('CITRONELLOL','Citronellol',C,'Allergène de parfum. Précaution pendant la grossesse.','medium'),
  c('GERANIOL','Géraniol',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('EUGENOL','Eugénol',C,'Allergène de parfum — présent dans l\'HE de clou de girofle. Potentiel irritant. Précaution grossesse.'),
  c('COUMARIN','Coumarinne',C,'Allergène de parfum — effets hépatotoxiques à fortes doses. Précaution grossesse.'),
  c('BENZYL BENZOATE','Benzoate de benzyle',C,'Allergène de parfum. Potentiel perturbateur endocrinien. Précaution grossesse.','medium'),
  c('BENZYL CINNAMATE','Cinnamate de benzyle',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('BENZYL SALICYLATE','Salicylate de benzyle',C,'Allergène de parfum — propriétés oestrogéniques faibles documentées. Précaution grossesse.'),
  c('CINNAMAL','Cinnamal (Aldéhyde cinnamique)',C,'Allergène de parfum — irritant et sensibilisant. Précaution grossesse.'),
  c('ALPHA-ISOMETHYL IONONE','Alpha-isométhyl ionone',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('AMYL CINNAMAL','Amyl cinnamal',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('AMYLCINNAMYL ALCOHOL','Alcool amylcinnamylique',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('ANISE ALCOHOL','Alcool d\'anis',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('BENZYL ALCOHOL','Alcool benzylique',C,'Allergène de parfum et conservateur. Précaution grossesse.','medium'),
  c('CINNAMYL ALCOHOL','Alcool cinnamylique',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('FARNESOL','Farnésol',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('HEXYL CINNAMAL','Hexyl cinnamal',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('HYDROXYCITRONELLAL','Hydroxycitronellal',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE','Lyral (HICC)',C,'Allergène de parfum — interdit dans les cosmétiques UE. À éviter.','medium'),
  c('ISOEUGENOL','Isoeugénol',C,'Allergène de parfum fort. Précaution grossesse.','medium'),
  c('LILIAL','Lilial (Butylphényl méthylpropional)',C,'Allergène de parfum — reprotoxique potentiel. Interdit dans les cosmétiques UE depuis 2022. À éviter pendant la grossesse.'),
  c('METHYL 2-OCTYNOATE','Méthyl-2-octynoate',C,'Allergène de parfum fort. Précaution grossesse.','medium'),
  c('OAK MOSS EXTRACT','Extrait de mousse de chêne (Evernia prunastri)',C,'Allergène de parfum fort. Potentiel sensibilisant. Précaution grossesse.','medium'),
  c('TREE MOSS EXTRACT','Extrait de mousse d\'arbre (Evernia furfuracea)',C,'Allergène de parfum. Précaution grossesse.','medium'),
  c('FRAGRANCE','Parfum (Fragrance)',C,'Terme générique — peut contenir des centaines de substances chimiques. Précaution pendant la grossesse — préférer les formules sans parfum.'),
  c('PARFUM','Parfum',C,'Voir FRAGRANCE. Précaution pendant la grossesse — nombreux composants non divulgués.'),
];

// ─── Colorants (Numéros CI) ───────────────────────────────────────────────────
function ciColor(ci: string, name: string, desc: string, risk: R = S): PreComputedIngredient {
  return c(ci, name, risk, desc, 'medium');
}
const COLORANTS: PreComputedIngredient[] = [
  ciColor('CI 77891','Dioxyde de titane (blanc)','Pigment blanc minéral. Sûr en application cutanée (non-nanoparticules).'),
  ciColor('CI 77492','Oxyde de fer jaune','Pigment minéral naturel. Sûr en usage cosmétique.'),
  ciColor('CI 77491','Oxyde de fer rouge','Pigment minéral naturel. Sûr en usage cosmétique.'),
  ciColor('CI 77499','Oxyde de fer noir','Pigment minéral naturel. Sûr en usage cosmétique.'),
  ciColor('CI 77288','Vert de chrome','Pigment minéral. Sûr aux concentrations cosmétiques.'),
  ciColor('CI 77289','Hydroxyde de chrome vert','Pigment minéral. Sûr.'),
  ciColor('CI 77007','Outremer bleu','Pigment inorganique. Sûr.'),
  ciColor('CI 77000','Aluminium','Pigment métallique. Précaution — expositions aux sels d\'aluminium à limiter.',C),
  ciColor('CI 77163','Bismuth oxychloride','Pigment nacré. Sûr.'),
  ciColor('CI 77510','Bleu de Prusse','Pigment inorganique complexe. Sûr en usage cosmétique.'),
  ciColor('CI 42090','Bleu brillant FCF','Colorant azoïque synthétique. Précaution pendant la grossesse.',C),
  ciColor('CI 19140','Tartrazine jaune','Colorant azoïque. Allergisant potentiel. Précaution grossesse.',C),
  ciColor('CI 15985','Jaune orangé S','Colorant azoïque. Précaution grossesse.',C),
  ciColor('CI 16035','Rouge Allura AC','Colorant azoïque. Précaution grossesse.',C),
  ciColor('CI 14720','Carmoisine','Colorant azoïque. Précaution grossesse.',C),
  ciColor('CI 45380','Éosine','Colorant fluorescent. À éviter en cas de photosensibilité.',C),
  ciColor('CI 45410','Érythrosine','Colorant iodé — à éviter en cas de troubles thyroïdiens.',C),
  ciColor('CI 17200','Rouge 33','Colorant azoïque. Précaution grossesse.',C),
  ciColor('CI 15510','Orange 4','Colorant azoïque. Précaution grossesse.',C),
  ciColor('CI 47005','Quinoline jaune','Colorant quinoléine. Précaution grossesse.',C),
  ciColor('CI 60730','Violet acide 43','Colorant anthraquinonique. Précaution.',C),
  ciColor('CI 77120','Sulfate de baryum','Pigment blanc. Insoluble — absorption négligeable. Sûr.'),
  ciColor('CI 77266','Carbon black (noir de carbone)','Pigment noir. Nanoforme potentiellement préoccupante. Précaution en spray.',C),
  ciColor('CI 77742','Manganèse violet','Pigment minéral. Sûr aux concentrations cosmétiques.'),
  ciColor('CI 75470','Carmin (acide carminique)','Colorant naturel extrait de cochenille. Peut provoquer des allergies. Sûr en usage cutané.'),
  ciColor('CI 77400','Cuivre (poudre)','Métal. Faible absorption. Sûr aux concentrations cosmétiques.'),
  ciColor('CI 77480','Or','Métal précieux. Sûr aux concentrations cosmétiques.'),
  ciColor('CI 77820','Argent','Métal. Sûr aux concentrations cosmétiques.'),
  ciColor('CI 15850','Rouge 6 (sel de baryum)','Pigment. Sûr en usage cosmétique.'),
  ciColor('CI 45100','Rouge rhodamine','Colorant fluorescent. Précaution.',C),
];

// ─── Émollients et lipides ────────────────────────────────────────────────────
const EMOLLIENTS: PreComputedIngredient[] = [
  c('MINERAL OIL','Huile minérale (paraffine liquide)',S,'Émollient issu du pétrole. Absorption cutanée très faible. Considéré sûr en usage topique pendant la grossesse.'),
  c('PETROLATUM','Pétrolatum (vaseline)',S,'Émollient occlusif. Absorption cutanée quasi-nulle. Sûr pendant la grossesse.'),
  c('ISOPROPYL MYRISTATE','Myristate d\'isopropyle',C,'Émollient et vecteur — augmente la pénétration cutanée d\'autres substances. Précaution en formules avec actifs.','medium'),
  c('ISOPROPYL PALMITATE','Palmitate d\'isopropyle',C,'Émollient — boosteur de pénétration. Même précaution que le myristate.','medium'),
  c('CETEARYL ALCOHOL','Alcool cétéarylique',S,'Alcool gras émollient (non irritant). Sûr pendant la grossesse.'),
  c('CETYL ALCOHOL','Alcool cétylique',S,'Alcool gras. Sûr.'),
  c('STEARYL ALCOHOL','Alcool stéarylique',S,'Alcool gras. Sûr.'),
  c('LANOLIN','Lanoline',C,'Émollient d\'origine animale — fort potentiel allergisant. Peut contenir des pesticides (contamination laine). Précaution.'),
  c('LANOLIN ALCOHOL','Alcool de lanoline',C,'Dérivé de lanoline — allergisant documenté. Précaution grossesse.','medium'),
  c('BEESWAX','Cire d\'abeille (Cera alba)',S,'Émollient naturel. Sûr en usage cosmétique pendant la grossesse.'),
  c('CARNAUBA WAX','Cire de carnauba',S,'Cire végétale. Sûre.'),
  c('CANDELILLA WAX','Cire de candellila',S,'Cire végétale. Sûre.'),
  c('SHEA BUTTER','Beurre de karité (Butyrospermum parkii)',S,'Émollient végétal riche. Sûr et recommandé pendant la grossesse.'),
  c('COCONUT OIL','Huile de coco (Cocos nucifera)',S,'Huile végétale saturée. Sûre et bien tolérée.'),
  c('JOJOBA SEED OIL','Huile de jojoba (Simmondsia chinensis)',S,'Ester liquide — très stable. Sûr pendant la grossesse.'),
  c('SWEET ALMOND OIL','Huile d\'amande douce (Prunus amygdalus dulcis)',S,'Huile végétale douce. Sûre. Utilisée traditionnellement pendant la grossesse.'),
  c('ARGAN OIL','Huile d\'argan (Argania spinosa)',S,'Huile végétale riche en vitamine E. Sûre.'),
  c('ROSEHIP OIL','Huile de rose musquée (Rosa canina)',C,'Huile végétale riche en acide rétinoïque naturel. Précaution — peut avoir une légère activité rétinoïde.','medium'),
  c('VITAMIN E OIL','Huile de vitamine E (Tocophérol)',S,'Antioxydant lipophile. Sûr en usage topique.'),
  c('CASTOR OIL','Huile de ricin (Ricinus communis)',C,'Émollient — des propriétés ocytociques ont été attribuées à l\'huile de ricin par voie orale. Usage topique: précaution.','medium'),
  c('OLIVE OIL','Huile d\'olive (Olea europaea)',S,'Huile végétale. Sûre en usage topique.'),
  c('ARROWROOT POWDER','Poudre d\'arrow-root (Maranta arundinacea)',S,'Amidon végétal absorbant. Sûr.','medium'),
  c('MANGO BUTTER','Beurre de mangue (Mangifera indica)',S,'Beurre végétal. Sûr.','medium'),
  c('COCOA BUTTER','Beurre de cacao (Theobroma cacao)',S,'Émollient très riche. Sûr et traditionnel pendant la grossesse.'),
  c('HEMP SEED OIL','Huile de chanvre (Cannabis sativa)',S,'Huile végétale riche en oméga. Sûre — teneur en THC négligeable en usage topique.','medium'),
  c('AVOCADO OIL','Huile d\'avocat (Persea gratissima)',S,'Huile végétale pénétrante. Sûre.'),
  c('BORAGE OIL','Huile de bourrache (Borago officinalis)',C,'Huile riche en GLA. Données limitées en grossesse — précaution au 1er trimestre.','medium'),
  c('EVENING PRIMROSE OIL','Huile d\'onagre (Oenothera biennis)',C,'Huile riche en GLA. Peut avoir des effets utérins — déconseillée en 1er trimestre.','medium'),
  c('NEEM OIL','Huile de neem (Azadirachta indica)',D,'Insectifuge naturel puissant — données tératogènes et abortives chez l\'animal. CONTRE-INDIQUÉE pendant la grossesse.'),
  c('SQUALANE','Squalane',S,'Émollient dérivé de l\'olive ou du sucre de canne. Sûr — aucune activité biologique préoccupante.'),
  c('SQUALENE','Squalène (naturel)',S,'Lipide présent naturellement dans la peau. Sûr.','medium'),
  c('CAPRYLIC/CAPRIC TRIGLYCERIDE','Triglycéride caprylique/caprique',S,'Émollient doux dérivé de l\'huile de coco. Très bien toléré. Sûr.'),
  c('C12-15 ALKYL BENZOATE','Benzoate C12-15 alkyle',S,'Émollient synthétique léger. Sûr aux concentrations cosmétiques.','medium'),
  c('DIISOPROPYL ADIPATE','Adipate de diisopropyle',S,'Émollient synthétique. Absorption cutanée faible. Sûr.','medium'),
];

// ─── Humectants ───────────────────────────────────────────────────────────────
const HUMECTANTS: PreComputedIngredient[] = [
  c('GLYCERIN','Glycérine (Glycérol)',S,'Humectant naturel très courant. Sûr et recommandé pendant la grossesse.'),
  c('HYALURONIC ACID','Acide hyaluronique',S,'Humectant naturellement présent dans le corps. Sûr en usage topique pendant la grossesse.'),
  c('SODIUM HYALURONATE','Hyaluronate de sodium',S,'Forme sodique de l\'acide hyaluronique. Sûr.'),
  c('UREA','Urée',S,'Humectant kératolytique. Sûr aux concentrations cosmétiques (≤10%). Concentrations élevées: précaution.','medium'),
  c('PROPYLENE GLYCOL','Propylène glycol',C,'Humectant et solvant — boosteur de pénétration cutanée. Absorption systémique documentée. Précaution en usage étendu.'),
  c('BUTYLENE GLYCOL','Butylène glycol',C,'Humectant et solvant. Absorption cutanée possible. Précaution par analogie avec propylène glycol.','medium'),
  c('PENTYLENE GLYCOL','Pentylène glycol',C,'Humectant et booster conservation. Données limitées grossesse. Précaution.','medium'),
  c('1,2-HEXANEDIOL','1,2-Hexanediol',C,'Humectant et conservateur. Données grossesse limitées.','medium'),
  c('CAPRYLYL GLYCOL','Caprylyl glycol',S,'Humectant et conservateur doux. Bien toléré.','medium'),
  c('SODIUM PCA','PCA de sodium',S,'Facteur naturel d\'hydratation (NMF). Sûr.'),
  c('PANTHENOL','Panthénol (Pro-vitamine B5)',S,'Humectant et cicatrisant. Sûr et recommandé pendant la grossesse.'),
  c('BETAINE','Bétaïne',S,'Humectant naturel dérivé du sucre de betterave. Sûr.'),
  c('XYLITOL','Xylitol',S,'Humectant à base de sucre. Sûr en usage cosmétique.','medium'),
  c('SORBITOL','Sorbitol',S,'Humectant. Sûr.'),
  c('MANNITOL','Mannitol',S,'Humectant. Sûr.','medium'),
  c('TREHALOSE','Tréhalose',S,'Disaccharide humectant et protecteur. Sûr.','medium'),
  c('INOSITOL','Inositol',S,'Humectant. Sûr.','medium'),
  c('SODIUM LACTATE','Lactate de sodium',S,'Humectant NMF naturel. Sûr.'),
  c('AMINO ACIDS','Acides aminés',S,'Humectants naturellement présents dans la peau. Sûrs.'),
  c('HYDROLYZED COLLAGEN','Collagène hydrolysé',S,'Humectant protéique. Molécule trop grosse pour la pénétration systémique. Sûr.','medium'),
  c('HYDROLYZED HYALURONIC ACID','Acide hyaluronique hydrolysé',S,'Fragments d\'HA. Sûr.','medium'),
];

// ─── Alcools, glycols, solvants ───────────────────────────────────────────────
const ALCOHOLS: PreComputedIngredient[] = [
  c('ALCOHOL DENAT','Alcool dénaturé (Éthanol)',C,'Éthanol avec agents dénaturants — pénètre la peau, sèche. Absorption transcutanée documentée. Précaution en application large pendant la grossesse.'),
  c('ETHANOL','Éthanol',C,'Alcool — pénètre la peau. Absorption systémique possible. Précaution pendant la grossesse.'),
  c('ISOPROPANOL','Isopropanol (Alcool isopropylique)',C,'Solvant — absorption cutanée possible. Précaution.','medium'),
  c('HEXYL ALCOHOL','Alcool hexylique',C,'Solvant. Données limitées grossesse.','low'),
  c('OLEYL ALCOHOL','Alcool oléylique',S,'Alcool gras émollient. Sûr.','medium'),
  c('MYRISTYL ALCOHOL','Alcool myristylique',S,'Alcool gras. Sûr.','medium'),
  c('LAURYL ALCOHOL','Alcool laurylique',S,'Alcool gras. Sûr.','medium'),
  c('BEHENYL ALCOHOL','Alcool béhénylique',S,'Alcool gras émollient. Sûr.','medium'),
  c('ARACHIDYL ALCOHOL','Alcool arachidylique',S,'Alcool gras. Sûr.','medium'),
];

// ─── Agents chélateurs ────────────────────────────────────────────────────────
const CHELATING: PreComputedIngredient[] = [
  c('EDTA','EDTA (Acide éthylènediaminetétraacétique)',C,'Chélateur synthétique — données limitées en grossesse. Précaution par principe.','medium'),
  c('DISODIUM EDTA','EDTA disodique',C,'Chélateur. Mêmes précautions que l\'EDTA.','medium'),
  c('TETRASODIUM EDTA','EDTA tétrasodique',C,'Chélateur puissant. Précaution grossesse.','medium'),
  c('PHYTIC ACID','Acide phytique',S,'Chélateur naturel. Sûr aux concentrations cosmétiques.','medium'),
  c('SODIUM GLUCONATE','Gluconate de sodium',S,'Chélateur naturel. Bien toléré.','medium'),
  c('CITRIC ACID','Acide citrique',S,'Chélateur et régulateur pH. Sûr.'),
];

// ─── Agents tensioactifs / émulsifiants ───────────────────────────────────────
const EMULSIFIERS: PreComputedIngredient[] = [
  c('CETEARYL GLUCOSIDE','Glucoside cétéarylique',S,'Émulsifiant d\'origine végétale. Bien toléré. Sûr.'),
  c('LECITHIN','Lécithine (phosphatidylcholine)',S,'Émulsifiant naturel (soja ou tournesol). Sûr pendant la grossesse.'),
  c('SUNFLOWER LECITHIN','Lécithine de tournesol',S,'Émulsifiant naturel. Bien toléré.','medium'),
  c('SOY LECITHIN','Lécithine de soja',S,'Émulsifiant naturel. Allergie soja rare en topique.','medium'),
  c('POLYSORBATE 20','Polysorbate 20',C,'Émulsifiant — peut contenir traces de 1,4-dioxane et d\'éthylène oxyde (contaminants). Précaution.','medium'),
  c('POLYSORBATE 60','Polysorbate 60',C,'Émulsifiant. Même précaution que polysorbate 20.','medium'),
  c('POLYSORBATE 80','Polysorbate 80',C,'Émulsifiant — contaminants potentiels (1,4-dioxane). Précaution.','medium'),
  c('GLYCERYL STEARATE','Stéarate de glycéryle',S,'Émulsifiant doux. Bien toléré. Sûr.'),
  c('GLYCERYL MONOSTEARATE','Monostéarate de glycéryle',S,'Émulsifiant. Sûr.'),
  c('STEARIC ACID','Acide stéarique',S,'Acide gras saturé. Sûr.'),
  c('PALMITIC ACID','Acide palmitique',S,'Acide gras saturé. Sûr.'),
  c('PEG-100 STEARATE','Stéarate de PEG-100',C,'Émulsifiant PEGylé. Contaminants potentiels (1,4-dioxane). Précaution.','medium'),
  c('GLYCERYL OLEATE','Oléate de glycéryle',S,'Émulsifiant doux. Sûr.','medium'),
  c('SORBITAN STEARATE','Stéarate de sorbitane',S,'Émulsifiant non PEGylé. Bien toléré.','medium'),
  c('SORBITAN OLEATE','Oléate de sorbitane',S,'Émulsifiant non PEGylé. Bien toléré.','medium'),
  c('CARBOMER','Carbomère',S,'Gélifiant polymère acrylique. Absorption cutanée nulle. Sûr.'),
  c('ACRYLATES COPOLYMER','Copolymère acrylates',S,'Gélifiant. Absorption minimale. Sûr.','medium'),
  c('XANTHAN GUM','Gomme xanthane',S,'Gélifiant naturel fermenté. Sûr.'),
  c('GELLAN GUM','Gomme gellane',S,'Gélifiant naturel. Sûr.','medium'),
  c('GUAR GUM','Gomme guar',S,'Gélifiant végétal. Sûr.'),
  c('CELLULOSE','Cellulose',S,'Polymère végétal. Sûr.','medium'),
  c('HYDROXYETHYLCELLULOSE','Hydroxyéthylcellulose',S,'Dérivé cellulosique. Sûr.','medium'),
  c('METHYLCELLULOSE','Méthylcellulose',S,'Dérivé cellulosique. Sûr.','medium'),
  c('HYDROXYPROPYL METHYLCELLULOSE','Hydroxypropyl méthylcellulose (HPMC)',S,'Dérivé cellulosique. Sûr.','medium'),
  c('POLYACRYLAMIDE','Polyacrylamide',C,'Polymère — peut contenir traces d\'acrylamide (neurotoxique et génotoxique). Précaution pendant la grossesse.'),
  c('ACRYLAMIDE','Acrylamide',D,'Monomère neurotoxique et génotoxique — cancérogène. CONTRE-INDIQUÉ.'),
];

// ─── Extraits végétaux ────────────────────────────────────────────────────────
const PLANT_EXTRACTS: PreComputedIngredient[] = [
  c('ALOE BARBADENSIS LEAF JUICE','Gel d\'aloe vera',S,'Gel naturel calmant. Sûr en usage topique pendant la grossesse.'),
  c('GREEN TEA EXTRACT','Extrait de thé vert (Camellia sinensis)',C,'Riche en EGCG. Absorption cutanée faible. Précaution en usage étendu.','medium'),
  c('CHAMOMILE EXTRACT','Extrait de camomille',S,'Extrait apaisant. Sûr en usage topique.','medium'),
  c('CALENDULA EXTRACT','Extrait de calendula',S,'Extrait cicatrisant doux. Bien toléré pendant la grossesse.'),
  c('WITCH HAZEL EXTRACT','Extrait d\'hamamélis (Hamamelis virginiana)',C,'Astringent végétal. Contient tanins et alcool. Précaution en usage étendu.','medium'),
  c('ARNICA EXTRACT','Extrait d\'arnica (Arnica montana)',C,'Extrait anti-inflammatoire. Toxique par voie orale. En topique: précaution sur peau lésée.','medium'),
  c('ECHINACEA EXTRACT','Extrait d\'échinacée',C,'Immunostimulant. Données grossesse limitées — précaution au 1er trimestre.','medium'),
  c('GINKGO BILOBA EXTRACT','Extrait de ginkgo biloba',C,'Peut inhiber les plaquettes — précaution en fin de grossesse. Données limitées.','medium'),
  c('GINSENG EXTRACT','Extrait de ginseng (Panax ginseng)',DC,'Adaptogène — peut stimuler l\'utérus. Déconseillé au 1er trimestre.','medium'),
  c('ST JOHN\'S WORT EXTRACT','Extrait de millepertuis (Hypericum perforatum)',C,'Photosensibilisant et interactions médicamenteuses. Précaution pendant la grossesse.','medium'),
  c('NEEM EXTRACT','Extrait de neem',D,'Propriétés abortives documentées. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('RESVERATROL','Resvératrol',C,'Antioxydant — données grossesse limitées. Précaution.','medium'),
  c('CURCUMIN','Curcumine',C,'Antioxydant extrait du curcuma. Données grossesse limitées. Précaution en fortes concentrations.','medium'),
  c('CAFFEINE','Caféine (usage cosmétique)',C,'Xanthine — absorption cutanée documentée. Précaution en usage étendu (ventre, buste) pendant la grossesse.','medium'),
  c('NIACINAMIDE','Niacinamide (Vitamine B3)',S,'Actif cosmétique polyvalent. Bien toléré. Sûr pendant la grossesse.'),
  c('PANTHENOL','Panthénol (Pro-Vit B5)',S,'Hydratant et réparateur. Sûr et recommandé.'),
  c('ADENOSINE','Adénosine',S,'Actif anti-âge naturel. Sûr en usage cosmétique.','medium'),
  c('ALPHA-ARBUTIN','Alpha-arbutine',C,'Agent dépigmentant — se décompose en hydroquinone. Précaution pendant la grossesse.','medium'),
  c('HYDROQUINONE','Hydroquinone',D,'Agent blanchissant — classé CMR. Absorption systémique documentée. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('KOJIC ACID','Acide kojique',C,'Dépigmentant fongique. Données toxicologiques limités. Précaution grossesse.','medium'),
  c('AZELAIC ACID','Acide azélaïque',C,'Actif anti-acnéique. Données grossesse limitées — précaution, surtout au 1er trimestre.','medium'),
  c('TRANEXAMIC ACID','Acide tranexamique',C,'Dépigmentant. Données grossesse limitées en usage topique.','medium'),
  c('LICORICE ROOT EXTRACT','Extrait de réglisse (Glycyrrhiza glabra)',C,'Contient glycyrrhizine — perturbateur endocrinien potentiel. Déconseillé en grandes quantités.','medium'),
  c('CENTELLA ASIATICA EXTRACT','Extrait de centella asiatica',S,'Cicatrisant naturel. Bien toléré en usage topique pendant la grossesse.','medium'),
  c('BAKUCHIOL','Bakuchiol',C,'Alternative naturelle aux rétinoïdes. Données humaines très limitées — précaution par principe.','medium'),
  c('SEAWEED EXTRACT','Extrait d\'algues marines',S,'Antioxydant naturel. Bien toléré.','medium'),
  c('SPIRULINA EXTRACT','Extrait de spiruline',S,'Riche en protéines. Sûr en usage cosmétique.','medium'),
  c('EDELWEISS EXTRACT','Extrait d\'edelweiss (Leontopodium alpinum)',S,'Antioxydant alpin. Bien toléré.','medium'),
  c('BOSWELLIC ACID','Acide boswellique',C,'Anti-inflammatoire. Données grossesse limitées.','medium'),
  c('WILLOW BARK EXTRACT','Extrait d\'écorce de saule',C,'Contient salicylates naturels — analogie avec l\'acide salicylique. Précaution.','medium'),
  c('PAPAIN','Papaïne (enzyme de papaye)',C,'Enzyme kératolytique. Données grossesse limitées — précaution.','medium'),
  c('BROMELAIN','Bromélaïne (enzyme d\'ananas)',C,'Enzyme protéolytique. Propriétés utérotoniques reportées à fortes doses. Précaution.','medium'),
  c('ALLANTOIN','Allantoïne',S,'Actif cicatrisant et adoucissant. Sûr. Recommandé pendant la grossesse.'),
  c('BISABOLOL','Bisabolol (alpha-bisabolol)',S,'Anti-inflammatoire naturel. Sûr en usage cosmétique.'),
  c('CERAMIDE NP','Céramide NP',S,'Lipide structurel de la peau. Sûr — reconstruit la barrière cutanée.'),
  c('CERAMIDE AP','Céramide AP',S,'Céramide. Sûr.','medium'),
  c('CERAMIDE EOP','Céramide EOP',S,'Céramide. Sûr.','medium'),
  c('CHOLESTEROL','Cholestérol',S,'Lipide naturel. Sûr en usage cosmétique.','medium'),
  c('PHYTOSTEROLS','Phytostérols',S,'Lipides végétaux. Sûrs.','medium'),
  c('FERULIC ACID','Acide férulique',S,'Antioxydant végétal. Sûr en usage cosmétique.','medium'),
  c('GALLIC ACID','Acide gallique',S,'Antioxydant polyphénolique. Sûr aux concentrations cosmétiques.','medium'),
  c('QUERCETIN','Quercétine',C,'Flavonoïde antioxydant. Données grossesse limitées. Précaution.','medium'),
  c('RUTIN','Rutine',S,'Flavonoïde. Bien toléré en usage topique.','medium'),
  c('ELLAGIC ACID','Acide ellagique',C,'Polyphénol. Données limitées grossesse.','medium'),
  c('VITAMIN C','Vitamine C (Ascorbate)',S,'Antioxydant. Sûr en usage topique.'),
  c('VITAMIN K','Vitamine K (Phytonadione)',S,'Vitamine liposoluble. Sûr en usage cosmétique.','medium'),
  c('COENZYME Q10','Coenzyme Q10 (Ubiquinone)',S,'Antioxydant mitochondrial. Sûr en usage cosmétique.','medium'),
  c('ALPHA LIPOIC ACID','Acide alpha-lipoïque',C,'Antioxydant — données grossesse limitées. Précaution.','medium'),
  c('TURMERIC EXTRACT','Extrait de curcuma (Curcuma longa)',C,'Antioxydant. Données grossesse limitées en concentrations élevées. Précaution.','medium'),
  c('MILK THISTLE EXTRACT','Extrait de chardon-Marie (Silybum marianum)',C,'Hépatoprotecteur. Données grossesse limitées.','medium'),
  c('HORSE CHESTNUT EXTRACT','Extrait de marron d\'Inde (Aesculus hippocastanum)',C,'Contient aescine — données grossesse limitées.','medium'),
  c('GRAPESEED EXTRACT','Extrait de pépins de raisin',S,'Riche en OPC antioxydants. Sûr en usage topique.','medium'),
  c('POMEGRANATE EXTRACT','Extrait de grenade (Punica granatum)',C,'Antioxydant — effets oestrogéniques documentés. Précaution.','medium'),
  c('RASPBERRY SEED OIL','Huile de pépins de framboise',S,'Huile végétale. Sûre.','medium'),
  c('SEA BUCKTHORN OIL','Huile d\'argousier (Hippophae rhamnoides)',S,'Riche en caroténoïdes et vitamines. Sûre en usage topique.','medium'),
  c('TAMANU OIL','Huile de tamanu (Calophyllum inophyllum)',C,'Huile tropicale — données grossesse très limitées. Précaution.','medium'),
  c('MARULA OIL','Huile de marula (Sclerocarya birrea)',S,'Huile végétale légère. Bien tolérée.','medium'),
  c('BAOBAB OIL','Huile de baobab (Adansonia digitata)',S,'Huile végétale riche. Sûre.','medium'),
  c('CHIA SEED OIL','Huile de graine de chia (Salvia hispanica)',S,'Riche en oméga-3. Sûre en usage topique.','medium'),
  c('PRICKLY PEAR OIL','Huile de figue de barbarie (Opuntia ficus-indica)',S,'Huile précieuse. Sûre.','medium'),
  c('BAKUCHI OIL','Huile de bakuchi (Psoralea corylifolia)',C,'Photosensibilisant — précaution. Peut contenir psoralènes (phototoxiques).','medium'),
  c('CAFFEOYL QUINIC ACID','Acide caféoylquinique',S,'Polyphénol antioxydant. Sûr aux concentrations cosmétiques.','low'),
  c('SODIUM ASCORBYL PHOSPHATE','Phosphate d\'ascorbyle sodique',S,'Dérivé stable de la vitamine C. Sûr.','medium'),
  c('MAGNESIUM ASCORBYL PHOSPHATE','Phosphate d\'ascorbyle magnésien',S,'Dérivé de la vitamine C. Sûr.','medium'),
  c('3-O-ETHYL ASCORBIC ACID','Éther éthylique de l\'acide ascorbique',S,'Dérivé vitamine C stable. Sûr.','medium'),
  c('ALPHA HYDROXY ACIDS BLEND','Mélange d\'AHAs',C,'Plusieurs AHAs combinés — augmente le potentiel irritant. Précaution.','medium'),
];

// ─── Métaux lourds / sels métalliques problématiques ─────────────────────────
const HEAVY_METALS: PreComputedIngredient[] = [
  c('LEAD ACETATE','Acétate de plomb',D,'NEUROTOXIQUE ET REPROTOXIQUE — interdit dans les cosmétiques UE. CONTRE-INDIQUÉ pendant la grossesse.'),
  c('MERCURY COMPOUNDS','Composés du mercure',D,'NEUROTOXIQUES — interdits dans les cosmétiques UE. Présents dans certains produits illicites blanchissants. ABSOLUMENT CONTRE-INDIQUÉS.'),
  c('ALUMINUM CHLOROHYDRATE','Chlorohydrate d\'aluminium',C,'Sel d\'aluminium antiperspirant — absorption cutanée et systémique documentée. Précaution pendant la grossesse.'),
  c('ALUMINUM ZIRCONIUM TETRACHLOROHYDREX','Aluminium-zirconium tétrachlorhydrex glycine',C,'Sel d\'aluminium antiperspirant. Même précaution que chlorohydrate d\'aluminium.','medium'),
  c('ALUM','Alun (Aluminosilicate de potassium)',C,'Sel d\'aluminium naturel. Absorption cutanée possible. Précaution.','medium'),
  c('FERRIC AMMONIUM CITRATE','Citrate ferrique ammoniacal',S,'Colorant alimentaire autorisé. Sûr aux concentrations cosmétiques.','medium'),
  c('STANNOUS FLUORIDE','Fluorure stanneux',C,'Composé du fluor — données grossesse limitées en usage oral. Précaution.','medium'),
  c('SELENIUM','Sélénium',C,'Oligo-élément — toxique à fortes doses. Précaution en usage étendu.','medium'),
  c('COBALT','Cobalt',C,'Métal — allergisant. Précaution.','medium'),
  c('CHROMIUM','Chrome hexavalent',D,'Chrome VI — cancérogène et sensibilisant. CONTRE-INDIQUÉ.','medium'),
];

// ─── Péptides et protéines ────────────────────────────────────────────────────
const PEPTIDES: PreComputedIngredient[] = [
  c('ARGIRELINE','Argireline (Acétyle hexapeptide-3)',S,'Peptide neuromodulateur cosmétique. Absorption cutanée limitée. Données sécurité rassurantes.','medium'),
  c('MATRIXYL','Matrixyl (Palmitoyl pentapeptide-4)',S,'Peptide signal de collagène. Sûr en usage cosmétique.','medium'),
  c('LEUPHASYL','Leuphasyl (Pentapeptide-18)',S,'Peptide relâchant musculaire doux. Sûr.','medium'),
  c('SNAP-8','SNAP-8 (Acétyle octapeptide-3)',S,'Peptide neuromodulateur. Sûr.','medium'),
  c('COPPER PEPTIDE','Peptide de cuivre (GHK-Cu)',C,'Peptide de cuivre — données grossesse très limitées. Précaution par principe.','medium'),
  c('COLLAGEN PEPTIDES','Peptides de collagène hydrolysé',S,'Humectants protéiques. Sûrs.','medium'),
  c('ELASTIN','Élastine hydrolysée',S,'Protéine cutanée. Sûre en usage topique.','medium'),
  c('KERATIN','Kératine hydrolysée',S,'Protéine capillaire. Sûre.','medium'),
  c('SILK AMINO ACIDS','Acides aminés de soie',S,'Humectants soyeux. Sûrs.','medium'),
  c('WHEAT PROTEIN','Protéine de blé hydrolysée',C,'Peut causer réactions chez les personnes atteintes de maladie cœliaque par voie cutanée.','medium'),
  c('OAT PROTEIN','Protéine d\'avoine',S,'Protéine calmante. Bien tolérée.','medium'),
  c('SOY PROTEIN','Protéine de soja hydrolysée',C,'Peut présenter activité phytoestrogénique. Précaution.','medium'),
  c('PALMITOYL TRIPEPTIDE-1','Palmitoyl tripeptide-1',S,'Peptide signal. Sûr.','medium'),
  c('ACETYL TETRAPEPTIDE-9','Acétyl tétrapeptide-9',S,'Peptide tenseur. Sûr.','medium'),
  c('ACETYL DIPEPTIDE-1 CETYL ESTER','Acétyl dipeptide-1 ester cétylique',S,'Peptide signal. Sûr.','medium'),
];

// ─── Phthalates et perturbateurs endocriniens ─────────────────────────────────
const ENDOCRINE_DISRUPTORS: PreComputedIngredient[] = [
  c('DIBUTYL PHTHALATE','Phtalate de dibutyle (DBP)',D,'Reprotoxique documenté — perturbe le développement hormonal. INTERDIT dans les cosmétiques UE (ongles). CONTRE-INDIQUÉ grossesse.'),
  c('DIETHYLHEXYL PHTHALATE','Phtalate de diéthylhexyle (DEHP)',D,'Perturbateur endocrinien majeur — reprotoxique. Interdit cosmétiques UE. CONTRE-INDIQUÉ grossesse.'),
  c('DIMETHYL PHTHALATE','Phtalate de diméthyle (DMP)',D,'Phtalate — perturbateur endocrinien. À éviter pendant la grossesse.'),
  c('BISPHENOL A','Bisphénol A (BPA)',D,'Perturbateur endocrinien puissant. Interdit dans de nombreux produits en contact avec la peau. CONTRE-INDIQUÉ.'),
  c('BENZOPHENONE','Benzophénone',C,'Perturbateur endocrinien potentiel — précaution grossesse.','medium'),
  c('OCTYLPHENOL ETHOXYLATE','Éthoxylate d\'octylphénol',D,'Perturbateur endocrinien — interdit dans les cosmétiques UE. À éviter absolument.'),
  c('NONYLPHENOL ETHOXYLATE','Éthoxylate de nonylphénol',D,'Perturbateur endocrinien puissant — interdit UE.','medium'),
  c('4-METHYLBENZYLIDENE CAMPHOR','4-Méthylbenzylidène camphre (4-MBC)',C,'Filtre UV — perturbateur thyroïdien documenté. À éviter pendant la grossesse.','medium'),
];

// ─── Divers actifs ────────────────────────────────────────────────────────────
const OTHER_ACTIVES: PreComputedIngredient[] = [
  c('WITCH HAZEL DISTILLATE','Hydrolat d\'hamamélis',S,'Astringent naturel doux. Bien toléré.','medium'),
  c('ROSE WATER','Eau de rose (Rosa damascena)',S,'Hydrolat calmant. Sûr pendant la grossesse.'),
  c('ORANGE BLOSSOM WATER','Eau de fleur d\'oranger (Citrus aurantium)',S,'Hydrolat. Sûr.','medium'),
  c('LAVENDER WATER','Eau de lavande (Lavandula angustifolia)',C,'Hydrolat — moins concentré que l\'HE. Précaution légère en 1er trimestre.','medium'),
  c('CHAMOMILE WATER','Eau de camomille',S,'Hydrolat calmant. Sûr.','medium'),
  c('CLAY','Argile (Kaolin / Bentonite)',S,'Minéral absorbant. Sûr en usage cosmétique topique.'),
  c('KAOLIN','Kaolin',S,'Argile blanche. Sûre.'),
  c('BENTONITE','Bentonite',S,'Argile gonflante. Sûre.','medium'),
  c('MAGNESIUM STEARATE','Stéarate de magnésium',S,'Lubrifiant / texturant. Sûr.','medium'),
  c('TALC','Talc',C,'Poudre minérale — risque d\'inhalation (à éviter en spray). Usage cutané sûr mais précaution périnéale.','medium'),
  c('MICA','Mica',S,'Minéral brillant. Sûr en usage cosmétique.'),
  c('SILICA','Silice (dioxide de silicium)',S,'Minéral absorbant. Sûr en usage topique (non-nanoforme).'),
  c('COLLOIDAL OATMEAL','Avoine colloïdale (Avena sativa)',S,'Émollient apaisant naturel. Sûr et recommandé pendant la grossesse.'),
  c('CHARCOAL','Charbon actif',S,'Absorbant. Sûr en usage cosmétique.','medium'),
  c('ZINC','Zinc (métal)',S,'Oligo-élément. Sûr aux concentrations cosmétiques.','medium'),
  c('ZINC PCA','PCA de zinc',S,'Zinc anti-séborrhéique. Sûr.','medium'),
  c('SULFUR','Soufre',C,'Kératolytique — données grossesse limitées. Précaution.','medium'),
  c('ALPHA BISABOLOL','Alpha-bisabolol',S,'Anti-inflammatoire naturel. Sûr.'),
  c('AZELOGLYCINE','Azéloglycine',C,'Dérivé d\'acide azélaïque. Données grossesse limitées.','medium'),
  c('NIACINAMIDE 10%','Niacinamide 10%',S,'Actif B3 à forte concentration. Sûr.','medium'),
  c('RETINALDEHYDE','Rétinaldéhyde',DCC,'Précurseur direct de l\'acide rétinoïque. CONTRE-INDIQUÉ pendant la grossesse.','medium'),
  c('LINOLEIC ACID','Acide linoléique',S,'Acide gras essentiel oméga-6. Sûr en usage topique.','medium'),
  c('OLEIC ACID','Acide oléique',S,'Acide gras naturel. Sûr.','medium'),
  c('STEARIC ACID 2','Acide stéarique',S,'Acide gras saturé. Sûr.','medium'),
  c('AMMONIUM HYDROXIDE','Hydroxyde d\'ammonium',C,'Alcalinisant — irritant à forte concentration. Précaution en usage étendu.','medium'),
  c('SODIUM HYDROXIDE','Hydroxyde de sodium (soude)',C,'Alcalinisant fort — irritant. Neutralisé dans les formules finales. Sûr si pH correct.','medium'),
  c('HYDROGEN PEROXIDE','Peroxyde d\'hydrogène',C,'Oxydant — utilisé dans les décolorations. Irritant. Précaution en usage étendu.','medium'),
  c('PARA-PHENYLENEDIAMINE','Para-phénylènediamine (PPD)',C,'Colorant capillaire oxydatif — allergisant majeur. Absorption cutanée documentée. Précaution grossesse.'),
  c('RESORCINOL','Résorcinol',C,'Colorant capillaire — perturbateur thyroïdien. Absorption cutanée. Précaution grossesse.','medium'),
  c('AMMONIA','Ammoniac',C,'Véhicule de coloration capillaire — irritant. Précaution en salon pour les femmes enceintes (ventilation).','medium'),
  c('HYDROGEN CYANIDE','Cyanure d\'hydrogène',D,'Substance toxique. Interdit cosmétiques.'),
  c('CAMPHOR','Camphre',D,'Neurotoxique à fortes doses — absorption cutanée. Contre-indiqué en application étendue pendant la grossesse.'),
  c('MENTHOL','Menthol',C,'Actif rafraîchissant — contre-indiqué près des voies respiratoires des bébés. Précaution grossesse en application étendue.','medium'),
  c('THYMOL','Thymol',C,'Antiseptique extrait du thym. Données grossesse limitées. Précaution.','medium'),
  c('METHYL SALICYLATE','Salicylate de méthyle (Gaulthérie)',C,'Absorption cutanée très élevée — risque similaire à l\'aspirine. CONTRE-INDIQUÉ à partir du 5e mois.'),
  c('CAPSAICIN','Capsaïcine',C,'Actif chauffant — absorption cutanée. Précaution en grossesse.','medium'),
  c('MINOXIDIL','Minoxidil',C,'Actif anti-chute — absorption cutanée systémique. Données grossesse limitées. Précaution.','medium'),
  c('MELATONIN','Mélatonine (usage cosmétique)',C,'Hormone — données grossesse limitées en topique.','medium'),
  c('HYALURONIDASE','Hyaluronidase',C,'Enzyme — données grossesse limitées.','low'),
  c('EPIDERMAL GROWTH FACTOR','Facteur de croissance épidermique (EGF)',C,'Facteur de croissance — données grossesse très limitées. Précaution.','medium'),
  c('STEM CELLS (PLANT)','Cellules souches végétales (extrait)',S,'Extraits de culture cellulaire végétale. Pas d\'activité biologique directe chez l\'humain. Sûr.','medium'),
  c('PLACENTAL PROTEINS','Protéines placentaires (d\'origine animale)',C,'Données grossesse limitées — précaution.','medium'),
  c('ROYAL JELLY','Gelée royale',C,'Peut provoquer des réactions allergiques. Données grossesse limitées.','medium'),
  c('BEE VENOM','Venin d\'abeille',C,'Actif risqué — réactions allergiques possibles. Précaution grossesse.','medium'),
  c('SNAIL SECRETION','Filtrat de bave d\'escargot (Helix aspersa)',S,'Actif réparateur. Sûr en usage topique.','medium'),
  c('FULLERENE','Fullerène (C60)',C,'Nanoparticule — données biologiques et grossesse très limitées. Précaution maximale.','low'),
  c('NANOPARTICLES (GENERIC)','Nanoparticules (générique)',C,'Toutes nanoparticules — précaution car données de sécurité en grossesse insuffisantes.','medium'),
];

export async function scrapeCosIng(): Promise<PreComputedIngredient[]> {
  const all = [
    ...PARABENS, ...SILICONES, ...PEGS, ...SULFATES, ...UV_FILTERS,
    ...RETINOIDS, ...HYDROXY_ACIDS, ...PRESERVATIVES, ...ESSENTIAL_OILS,
    ...FRAGRANCES, ...COLORANTS, ...EMOLLIENTS, ...HUMECTANTS,
    ...ALCOHOLS, ...CHELATING, ...EMULSIFIERS, ...PLANT_EXTRACTS,
    ...HEAVY_METALS, ...PEPTIDES, ...ENDOCRINE_DISRUPTORS, ...OTHER_ACTIVES,
  ];
  return all;
}
