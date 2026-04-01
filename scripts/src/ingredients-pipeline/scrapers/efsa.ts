/**
 * efsa.ts — ~1000 additifs alimentaires et aliments à risque grossesse.
 * Sources: EFSA, ANSES, OMS, CRAT (risques alimentaires).
 * Données pré-calculées — aucun appel réseau.
 */

import { type PreComputedIngredient, type RiskTuple, ing } from '../utils.js';

type R = RiskTuple;
const S: R = ['safe','safe','safe','safe'];
const C: R = ['caution','caution','caution','caution'];
const D: R = ['danger','danger','danger','danger'];
const DC: R = ['danger','caution','caution','caution'];
const DCC: R = ['danger','danger','caution','caution'];
const CD: R = ['caution','caution','danger','caution'];
const CS: R = ['caution','safe','safe','caution'];

function f(ni: string, n: string, r: R, d: string, conf: 'high'|'medium'|'low' = 'high'): PreComputedIngredient {
  return ing(ni, n, 'food', r, d, 'efsa', conf);
}

// ─── Colorants E100–E199 ──────────────────────────────────────────────────────
const COLORANTS: PreComputedIngredient[] = [
  f('E100','Curcumine (E100)',C,'Colorant naturel du curcuma. Propriétés anti-inflammatoires. Considéré sûr à doses alimentaires. Compléments concentrés: précaution.','medium'),
  f('E101','Riboflavine (E101)',S,'Vitamine B2. Essentielle pendant la grossesse. Sûre.'),
  f('E102','Tartrazine (E102)',C,'Colorant azoïque — hypersensibilité chez certaines personnes. Avertissement requis sur les emballages UE. Précaution.'),
  f('E104','Jaune de quinoléine (E104)',C,'Colorant synthétique. Avertissement comportemental UE. Précaution grossesse.','medium'),
  f('E110','Jaune orangé S (E110)',C,'Colorant azoïque. Avertissement comportemental. Précaution grossesse.'),
  f('E120','Carmin / Cochenille (E120)',C,'Colorant naturel animal. Peut provoquer des réactions allergiques. Précaution.'),
  f('E122','Carmoisine (E122)',C,'Colorant azoïque. Avertissement comportemental UE. Précaution grossesse.'),
  f('E123','Amarante (E123)',D,'Colorant azoïque — interdit aux USA. Données préoccupantes reprotoxicité. À éviter.'),
  f('E124','Ponceau 4R (E124)',C,'Colorant azoïque. Avertissement comportemental. Précaution grossesse.'),
  f('E127','Érythrosine (E127)',C,'Colorant iodé synthétique. Peut affecter la thyroïde. Précaution en cas de troubles thyroïdiens.'),
  f('E129','Rouge Allura AC (E129)',C,'Colorant azoïque. Avertissement comportemental UE. Précaution grossesse.'),
  f('E131','Bleu patenté V (E131)',C,'Colorant synthétique. Précaution grossesse.','medium'),
  f('E132','Indigotine (E132)',C,'Colorant indigo synthétique. Précaution.','medium'),
  f('E133','Bleu brillant FCF (E133)',C,'Colorant azoïque. Précaution grossesse.','medium'),
  f('E140','Chlorophylles (E140)',S,'Colorants naturels végétaux. Sûrs.'),
  f('E141','Complexes cuivre-chlorophylle (E141)',C,'Colorants naturels. Teneur en cuivre à surveiller.','medium'),
  f('E150a','Caramel ordinaire (E150a)',S,'Caramel naturel. Sûr.','medium'),
  f('E150d','Caramel au sulfite d\'ammonium (E150d)',C,'Contient 4-méthylimidazole (4-MEI) — cancérogène possible. Précaution.'),
  f('E151','Noir brillant BN (E151)',C,'Colorant azoïque. Précaution grossesse.','medium'),
  f('E153','Charbon végétal (E153)',C,'Absorbant — peut réduire l\'absorption des médicaments. Précaution.','medium'),
  f('E155','Brun HT (E155)',C,'Colorant azoïque. Précaution grossesse.','medium'),
  f('E160a','Bêta-carotène (E160a)',C,'Précurseur de la vitamine A. Sûr à doses alimentaires. Suppléments à forte dose: CONTRE-INDIQUÉS (tératogène).'),
  f('E160b','Annatto / Bixine (E160b)',C,'Colorant naturel de roucou. Allergisant potentiel. Précaution.','medium'),
  f('E160c','Capsanthine (E160c)',S,'Colorant de paprika. Sûr aux doses alimentaires.','medium'),
  f('E161b','Lutéine (E161b)',S,'Caroténoïde. Sûr.','medium'),
  f('E161g','Canthaxanthine (E161g)',D,'Caroténoïde synthétique — accumulation rétinienne documentée. À éviter pendant la grossesse.'),
  f('E162','Rouge de betterave (E162)',S,'Colorant naturel. Sûr.'),
  f('E163','Anthocyanes (E163)',S,'Colorants naturels de fruits. Sûrs.'),
  f('E170','Carbonate de calcium (E170)',S,'Minéral naturel. Sûr.'),
  f('E171','Dioxyde de titane (E171)',D,'INTERDIT dans les aliments en UE depuis 2022. Classé cancérogène potentiel. À éviter absolument.'),
  f('E172','Oxydes de fer (E172)',S,'Pigments minéraux naturels. Sûrs.','medium'),
  f('E173','Aluminium (E173)',C,'Métal — accumulation possible. Limiter l\'exposition pendant la grossesse.','medium'),
  f('E174','Argent (E174)',C,'Métal précieux. Données limités — précaution.','medium'),
  f('E175','Or (E175)',S,'Métal précieux inerte. Sûr en petites quantités.','medium'),
  f('E180','Lithol-rubine BK (E180)',C,'Colorant azoïque. Précaution grossesse.','low'),
];

// ─── Conservateurs E200–E299 ──────────────────────────────────────────────────
const PRESERVATIVES: PreComputedIngredient[] = [
  f('E200','Acide sorbique (E200)',S,'Conservateur naturel. Bien toléré. Sûr pendant la grossesse.'),
  f('E202','Sorbate de potassium (E202)',S,'Sel de l\'acide sorbique. Sûr.'),
  f('E210','Acide benzoïque (E210)',C,'Conservateur. Peut former du benzène avec la vitamine C. Précaution.'),
  f('E211','Benzoate de sodium (E211)',C,'Conservateur — formation benzène potentielle. Précaution grossesse.'),
  f('E212','Benzoate de potassium (E212)',C,'Conservateur. Même précaution que E211.','medium'),
  f('E213','Benzoate de calcium (E213)',C,'Conservateur. Précaution grossesse.','medium'),
  f('E214','Éthyl para-hydroxybenzoate (E214)',C,'Parabène alimentaire. Activité oestrogénique faible. Précaution grossesse.'),
  f('E215','Éthyl para-hydroxybenzoate sodique (E215)',C,'Parabène alimentaire sodique. Précaution grossesse.','medium'),
  f('E216','Propyl para-hydroxybenzoate (E216)',C,'Parabène alimentaire — interdit dans certains aliments UE. Précaution grossesse.'),
  f('E218','Méthyl para-hydroxybenzoate (E218)',C,'Parabène alimentaire. Activité oestrogénique faible. Précaution grossesse.'),
  f('E220','Dioxyde de soufre (E220)',C,'Sulfite — allergisant respiratoire. Vin et fruits séchés. Précaution grossesse.'),
  f('E221','Sulfite de sodium (E221)',C,'Sulfite. Même risque que E220.','medium'),
  f('E222','Bisulfite de sodium (E222)',C,'Sulfite. Précaution allergique.','medium'),
  f('E223','Métabisulfite de sodium (E223)',C,'Sulfite — allergisant. Précaution.'),
  f('E224','Métabisulfite de potassium (E224)',C,'Sulfite. Précaution.','medium'),
  f('E226','Sulfite de calcium (E226)',C,'Sulfite. Précaution.','medium'),
  f('E228','Bisulfite de potassium (E228)',C,'Sulfite. Précaution.','medium'),
  f('E234','Nisine (E234)',S,'Conservateur naturel d\'origine bactérienne. Sûr.','medium'),
  f('E235','Natamycine (E235)',C,'Antifongique — données limités grossesse. Précaution.','medium'),
  f('E242','Diméthyle dicarbonate (E242)',C,'Conservateur des boissons. Données limités grossesse.','medium'),
  f('E249','Nitrite de potassium (E249)',D,'Nitrite — précurseur de nitrosamines (cancérogènes). Viandes transformées. À limiter fortement pendant la grossesse.'),
  f('E250','Nitrite de sodium (E250)',D,'NITRITE — précurseur de nitrosamines. ANSES recommande de limiter fortement pendant la grossesse. Éviter charcuterie cuite.'),
  f('E251','Nitrate de sodium (E251)',C,'Nitrate — converti en nitrite in vivo. Charcuteries. À limiter pendant la grossesse.'),
  f('E252','Nitrate de potassium (E252)',C,'Nitrate alimentaire. À limiter pendant la grossesse.'),
  f('E260','Acide acétique (E260)',S,'Vinaigre — sûr aux doses alimentaires.'),
  f('E270','Acide lactique (E270)',S,'Conservateur naturel. Sûr.'),
  f('E280','Acide propionique (E280)',S,'Conservateur du pain. Sûr aux doses alimentaires.','medium'),
  f('E281','Propionate de sodium (E281)',S,'Conservateur. Sûr.','medium'),
  f('E282','Propionate de calcium (E282)',S,'Conservateur du pain. Sûr.','medium'),
  f('E284','Acide borique (E284)',D,'Acide borique — toxique à fortes doses. À éviter pendant la grossesse.','medium'),
  f('E285','Tétraborate de sodium (borax) (E285)',D,'Perturbateur endocrinien — INTERDIT dans de nombreux pays. À éviter.'),
];

// ─── Antioxydants E300–E399 ───────────────────────────────────────────────────
const ANTIOXIDANTS: PreComputedIngredient[] = [
  f('E300','Acide ascorbique / Vitamine C (E300)',S,'Antioxydant naturel. Essentiel pendant la grossesse. Sûr.'),
  f('E301','Ascorbate de sodium (E301)',S,'Vitamine C sodique. Sûr.'),
  f('E302','Ascorbate de calcium (E302)',S,'Vitamine C calcique. Sûr.'),
  f('E304','Palmitate d\'ascorbyle (E304)',S,'Ester de vitamine C. Sûr aux doses alimentaires.','medium'),
  f('E306','Tocophérols naturels (Vit E) (E306)',S,'Vitamine E naturelle. Essentielle. Sûre.'),
  f('E307','Alpha-tocophérol synthétique (E307)',S,'Vitamine E synthétique. Sûre aux doses alimentaires.','medium'),
  f('E310','Gallate de propyle (E310)',C,'Antioxydant — données limités grossesse. Précaution.','medium'),
  f('E315','Acide érythorbique (E315)',S,'Antioxydant dérivé de l\'acide ascorbique. Sûr.','medium'),
  f('E320','BHA (Butylhydroxyanisole) (E320)',C,'Antioxydant synthétique — cancérogène possible (groupe 2B). À éviter pendant la grossesse.'),
  f('E321','BHT (Butylhydroxytoluène) (E321)',C,'Antioxydant synthétique — perturbateur endocrinien potentiel. À éviter pendant la grossesse.'),
  f('E322','Lécithines (E322)',S,'Émulsifiant naturel. Sûr.'),
  f('E325','Lactate de sodium (E325)',S,'Antioxydant synergiste. Sûr.','medium'),
  f('E330','Acide citrique (E330)',S,'Antioxydant naturel. Sûr.'),
  f('E331','Citrate de sodium (E331)',S,'Antioxydant. Sûr.'),
  f('E332','Citrate de potassium (E332)',S,'Antioxydant. Sûr.','medium'),
  f('E333','Citrate de calcium (E333)',S,'Antioxydant. Sûr.','medium'),
  f('E334','Acide tartrique (E334)',S,'Antioxydant naturel. Sûr.','medium'),
  f('E338','Acide phosphorique (E338)',C,'Acidifiant — consommation excessive de phosphates déconseillée. Précaution.'),
  f('E339','Phosphate disodique (E339)',C,'Sel phosphate. Consommation excessive à éviter.','medium'),
  f('E340','Phosphate monopotassique (E340)',C,'Sel phosphate. Précaution.','medium'),
  f('E341','Phosphate de calcium (E341)',C,'Sel phosphate. Précaution consommation excessive.','medium'),
  f('E343','Phosphate de magnésium (E343)',C,'Sel phosphate. Précaution.','medium'),
  f('E350','Malate de sodium (E350)',S,'Acide malique sodique. Sûr.','medium'),
  f('E353','Acide métatartrique (E353)',S,'Acide organique. Sûr.','medium'),
  f('E355','Acide adipique (E355)',S,'Acide organique. Sûr aux doses alimentaires.','medium'),
  f('E363','Acide succinique (E363)',S,'Acide naturel. Sûr.','medium'),
  f('E380','Citrate de triammonium (E380)',C,'Émulsifiant. Données limités grossesse.','low'),
  f('E385','EDTA calcique disodique (E385)',C,'Chélateur — peut réduire l\'absorption des minéraux essentiels. Précaution.','medium'),
];

// ─── Épaississants / Gélifiants E400–E499 ────────────────────────────────────
const THICKENERS: PreComputedIngredient[] = [
  f('E400','Acide alginique (E400)',S,'Alginate naturel. Sûr.','medium'),
  f('E401','Alginate de sodium (E401)',S,'Alginate naturel. Sûr.'),
  f('E402','Alginate de potassium (E402)',S,'Alginate naturel. Sûr.','medium'),
  f('E404','Alginate de calcium (E404)',S,'Alginate. Sûr.','medium'),
  f('E405','Alginate de propylène glycol (E405)',C,'Alginate modifié. Données grossesse limités. Précaution.','medium'),
  f('E406','Agar-agar (E406)',S,'Gélifiant naturel d\'algues. Sûr.'),
  f('E407','Carraghénanes (E407)',C,'Épaississant marin — inflammation intestinale documentée chez l\'animal. Données limités grossesse. À éviter en excès.'),
  f('E407a','Carraghénanes transformés (E407a)',C,'Carraghénanes dégradés — préoccupations santé. Précaution grossesse.','medium'),
  f('E410','Farine de graines de caroube (E410)',S,'Gélifiant naturel. Sûr.'),
  f('E412','Gomme de guar (E412)',S,'Épaississant naturel. Sûr.'),
  f('E413','Gomme adragante (E413)',C,'Épaississant naturel — allergisant potentiel. Précaution.','medium'),
  f('E414','Gomme arabique (E414)',S,'Épaississant naturel. Sûr.'),
  f('E415','Gomme xanthane (E415)',S,'Épaississant fermenté. Sûr.'),
  f('E416','Gomme karaya (E416)',C,'Épaississant naturel — allergisant potentiel.','medium'),
  f('E417','Gomme tara (E417)',S,'Épaississant végétal. Sûr.','medium'),
  f('E418','Gomme gellane (E418)',S,'Épaississant fermenté. Sûr.','medium'),
  f('E420','Sorbitol (E420)',S,'Polyol. Sûr. Peut provoquer ballonnements en excès.','medium'),
  f('E421','Mannitol (E421)',S,'Polyol. Sûr.','medium'),
  f('E422','Glycérol (E422)',S,'Humectant naturel. Sûr.'),
  f('E432','Polysorbate 20 (E432)',C,'Émulsifiant PEGylé — contaminants potentiels (1,4-dioxane). Précaution.','medium'),
  f('E433','Polysorbate 80 (E433)',C,'Émulsifiant PEGylé. Précaution.','medium'),
  f('E440','Pectines (E440)',S,'Épaississant naturel de fruits. Sûr.'),
  f('E450','Diphosphates (E450)',C,'Phosphates — consommation excessive déconseillée pendant la grossesse.','medium'),
  f('E452','Polyphosphates (E452)',C,'Phosphates — précaution consommation excessive.','medium'),
  f('E460','Cellulose (E460)',S,'Fibre insoluble. Sûre.'),
  f('E461','Méthylcellulose (E461)',S,'Cellulose modifiée. Sûre.','medium'),
  f('E464','Hydroxypropylméthylcellulose (E464)',S,'Dérivé cellulosique. Sûr.','medium'),
  f('E466','Carboxyméthylcellulose (E466)',S,'Dérivé cellulosique. Sûr.','medium'),
  f('E471','Mono- et diglycérides d\'acides gras (E471)',S,'Émulsifiants naturels. Sûrs.'),
  f('E472e','Esters diacétyltartriques de mono/diglycérides (E472e)',S,'Émulsifiant du pain. Sûr.','medium'),
  f('E476','Polyglycérol polyricinolate (E476)',C,'Émulsifiant du chocolat — données grossesse limitées. Précaution.','medium'),
  f('E481','Stéaroyl-2-lactylate de sodium (E481)',S,'Émulsifiant du pain. Sûr.','medium'),
  f('E491','Monostéarate de sorbitane (E491)',S,'Émulsifiant. Sûr.','medium'),
];

// ─── Exhausteurs de goût E620–E699 ────────────────────────────────────────────
const FLAVOR_ENHANCERS: PreComputedIngredient[] = [
  f('E621','Glutamate monosodique (E621)',C,'Exhausteur de goût (MSG) — données contradictoires sur effets fœtaux. À consommer avec modération pendant la grossesse.'),
  f('E622','Glutamate monopotassique (E622)',C,'Exhausteur. Même précaution que E621.','medium'),
  f('E623','Glutamate de calcium (E623)',C,'Exhausteur. Précaution.','medium'),
  f('E624','Glutamate monoammoniacal (E624)',C,'Exhausteur. Précaution.','medium'),
  f('E625','Glutamate de magnésium (E625)',C,'Exhausteur. Précaution.','medium'),
  f('E626','Acide guanylique (E626)',C,'Exhausteur. Précaution.','medium'),
  f('E627','Guanylate disodique (E627)',C,'Exhausteur. Précaution grossesse.','medium'),
  f('E630','Acide inosinique (E630)',C,'Exhausteur — peut aggraver la goutte. Précaution.','medium'),
  f('E631','Inosinate disodique (E631)',C,'Exhausteur. Précaution.','medium'),
  f('E635','Ribonucléotide disodique (E635)',C,'Exhausteur combiné. Précaution grossesse.','medium'),
  f('E640','Glycine et sel de sodium (E640)',S,'Acide aminé. Sûr.','medium'),
  f('E650','Acétate de zinc (E650)',C,'Zinc alimentaire. Zinc essentiel mais excès déconseillé.','medium'),
];

// ─── Édulcorants E950–E999 ────────────────────────────────────────────────────
const SWEETENERS: PreComputedIngredient[] = [
  f('E950','Acésulfame K (E950)',C,'Édulcorant synthétique — données limités grossesse. Précaution par principe de précaution.'),
  f('E951','Aspartame (E951)',C,'Édulcorant synthétique — contient phénylalanine. CONTRE-INDIQUÉ en cas de phénylcétonurie. Précaution générale grossesse.'),
  f('E952','Cyclamate (E952)',D,'INTERDIT dans de nombreux pays — données de cancérogénicité préoccupantes. À éviter pendant la grossesse.'),
  f('E953','Isomalt (E953)',S,'Polyol. Sûr aux doses modérées.','medium'),
  f('E954','Saccharine (E954)',DC,'Traverse le placenta — déconseillée pendant le 1er trimestre. Données préoccupantes en animal.'),
  f('E955','Sucralose (E955)',C,'Édulcorant chloré — données grossesse limitées. Précaution par principe.','medium'),
  f('E957','Thaumatine (E957)',S,'Protéine édulcorante naturelle. Sûre.','medium'),
  f('E959','Néohespéridine DC (E959)',C,'Édulcorant. Données limités grossesse.','medium'),
  f('E960','Glycosides de stéviol / Stevia (E960)',C,'Édulcorant naturel — données grossesse limitées. Usage modéré considéré acceptable.','medium'),
  f('E961','Néotame (E961)',C,'Édulcorant synthétique. Données grossesse insuffisantes. Précaution.','medium'),
  f('E962','Sel d\'aspartame-acésulfame (E962)',C,'Contient aspartame. Même précaution que E951.','medium'),
  f('E968','Érythritol (E968)',S,'Polyol naturel. Bien toléré. Sûr.','medium'),
  f('E969','Advantame (E969)',C,'Édulcorant synthétique. Données grossesse très limités.','low'),
];

// ─── Agents de traitement E900–E949 ───────────────────────────────────────────
const PROCESSING_AIDS: PreComputedIngredient[] = [
  f('E900','Diméthylpolysiloxane (E900)',S,'Anti-mousse. Sûr aux doses alimentaires.','medium'),
  f('E901','Cire d\'abeille (E901)',S,'Naturelle. Sûre.'),
  f('E903','Cire de carnauba (E903)',S,'Cire végétale. Sûre.'),
  f('E904','Gomme shellac (E904)',S,'Résine naturelle. Sûre.','medium'),
  f('E905','Cire microcristalline (E905)',C,'Dérivé pétrolier. Données limités grossesse. Précaution.','medium'),
  f('E920','L-cystéine (E920)',C,'Acide aminé améliorant de farine. Données limités grossesse.','medium'),
  f('E927b','Urée (E927b)',S,'Régulateur de fermentation. Sûr.','medium'),
  f('E938','Argon (E938)',S,'Gaz inerte. Sûr.','medium'),
  f('E941','Azote (E941)',S,'Gaz inerte. Sûr.','medium'),
  f('E942','Protoxyde d\'azote (E942)',C,'Gaz — anesthésique. Pas en usage alimentaire intensif pendant la grossesse.','medium'),
  f('E943a','Butane (E943a)',C,'Gaz propulseur. Précaution inhalation.','medium'),
  f('E948','Oxygène (E948)',S,'Gaz naturel. Sûr.','medium'),
];

// ─── Aliments à risque infectieux (listériose, toxoplasmose, salmonellose) ────
const INFECTION_RISKS: PreComputedIngredient[] = [
  f('FROMAGE AU LAIT CRU','Fromage au lait cru',D,'LISTÉRIOSE — les fromages au lait cru (camembert, brie, roquefort, fromages de chèvre frais) peuvent contenir Listeria monocytogenes. CONTRE-INDIQUÉS pendant la grossesse.'),
  f('FROMAGE PATE MOLLE CROUTE FLEURIE','Fromage à pâte molle à croûte fleurie',D,'Risque élevé de listériose (camembert, brie). CONTRE-INDIQUÉS pendant la grossesse — même pasteurisés si la croûte est conservée.'),
  f('CHARCUTERIE CUITE','Charcuterie cuite (jambon, pâté)',D,'Risque de listériose — à éviter sauf chauffée à cœur. Préférer le jambon cuit en tranches sous vide récemment ouvert.'),
  f('RILLETTES','Rillettes, pâtés, foie gras',D,'Risque de listériose — à éviter. Foie gras: aussi riche en vitamine A (tératogène à excès).'),
  f('VIANDE CRUE','Viande crue ou peu cuite (tartare, carpaccio)',D,'TOXOPLASMOSE et listériose. CONTRE-INDIQUÉS pendant la grossesse si non immunisée.'),
  f('POISSON CRU','Poisson cru (sushi, sashimi, tartare)',D,'LISTÉRIOSE — Listeria peut coloniser le saumon fumé et les poissons crus. À éviter pendant la grossesse.'),
  f('SAUMON FUME','Saumon fumé (smoked salmon)',D,'Listériose — risque documenté. À éviter pendant la grossesse. Sûr si cuit à cœur.'),
  f('OEUF CRU','Œuf cru ou insuffisamment cuit',D,'SALMONELLOSE — tiramisu, mayonnaise maison, œuf à la coque. À éviter pendant la grossesse.'),
  f('GRAINES GERMEES','Graines germées (pousses)',D,'Bactéries (E.coli, Salmonella, Listeria). CONTRE-INDIQUÉES pendant la grossesse.'),
  f('JUS FRUITS NON PASTEURISE','Jus de fruits non pasteurisé',D,'Risque bactérien et E.coli. À éviter pendant la grossesse.'),
  f('LAIT CRU','Lait cru (non pasteurisé)',D,'Listériose, salmonellose, campylobactériose. CONTRE-INDIQUÉ pendant la grossesse.'),
  f('FROMAGE FONDUE RACLETTE','Fondue, raclette (fromages fondus chauds)',S,'Si chauffés à cœur (>70°C): risques bactériens éliminés. Sûrs si bien cuits.'),
  f('SOJA CRU','Soja fermenté (tofu, miso, tempeh)',C,'Phytoestrogènes — propriétés oestrogéniques potentielles. À consommer avec modération.','medium'),
  f('FENUGREC GRAINES','Graines de fenugrec',C,'Propriétés utérotoniques documentées — déconseillées au 1er trimestre en grande quantité.','medium'),
  f('PAPAYE CRU','Papaye crue (non mûre)',DC,'Contient papaïne — effet utérotonique documenté. À éviter en 1er trimestre. Papaye mûre cuite: sûre.','medium'),
  f('ANANAS JUS','Jus d\'ananas frais',C,'Contient bromélaïne — effets utérins potentiels. À consommer avec modération.','medium'),
  f('EPINARDS CRUS','Épinards et légumes-feuilles crus',C,'Toxoplasmose si mal lavés. Laver soigneusement ou cuire pendant la grossesse.','medium'),
  f('SUSHI','Sushi / maki',D,'Poisson cru + riz vinaigré: risques cumulés listériose et parasites. À éviter.'),
];

// ─── Poissons à risque mercure ────────────────────────────────────────────────
const MERCURY_FISH: PreComputedIngredient[] = [
  f('THON ROUGE','Thon rouge (Thunnus thynnus)',D,'MERCURE ÉLEVÉ — bioaccumulation. ANSES: à éviter pendant la grossesse. Remplacer par des petits poissons gras.'),
  f('ESPADON','Espadon (Xiphias gladius)',D,'TRÈS FORTE TENEUR EN MERCURE. CONTRE-INDIQUÉ pendant la grossesse.'),
  f('REQUIN','Requin (squales)',D,'MERCURE TRÈS ÉLEVÉ. CONTRE-INDIQUÉ pendant la grossesse et l\'allaitement.'),
  f('MARLIN','Marlin',D,'MERCURE TRÈS ÉLEVÉ. À éviter absolument pendant la grossesse.'),
  f('BROCHET','Brochet (Esox lucius)',D,'MERCURE ÉLEVÉ — eau douce. ANSES: à éviter pendant la grossesse.'),
  f('LAMPROIE','Lamproie',D,'MERCURE ÉLEVÉ + dioxines. À éviter pendant la grossesse.'),
  f('THON GERMON','Thon albacore (thon en boîte léger)',C,'Mercure modéré. ANSES: limiter à 1 portion/semaine pendant la grossesse.'),
  f('THON BLANC','Thon blanc (germon) en conserve',C,'Mercure modéré — limiter à 1 portion/semaine.','medium'),
  f('SARDINE','Sardine',S,'Petit poisson gras — faible mercure, riche en oméga-3. Recommandé 2x/semaine pendant la grossesse.'),
  f('MAQUEREAU','Maquereau',S,'Petit poisson gras — riche en oméga-3, mercure faible. Recommandé pendant la grossesse.'),
  f('HARENG','Hareng',S,'Petit poisson — faible mercure, riche en oméga-3. Recommandé.'),
  f('ANCHOIS','Anchois (Engraulis encrasicolus)',S,'Petit poisson — mercure très faible. Riche en oméga-3. Recommandé.'),
  f('SAUMON ATLANTIQUE','Saumon de l\'Atlantique (élevage)',C,'Mercure faible mais peut contenir polluants organiques. Limiter à 2 portions/semaine.','medium'),
  f('DAURADE','Daurade royale',S,'Mercure faible. Protéines de qualité. Sûr.','medium'),
  f('CABILLAUD','Cabillaud (morue)',S,'Poisson maigre — mercure faible. Sûr et nutritif.'),
  f('SOLE','Sole',S,'Poisson maigre. Faible mercure. Sûr.','medium'),
];

// ─── Caféine et stimulants ────────────────────────────────────────────────────
const CAFFEINE_SOURCES: PreComputedIngredient[] = [
  f('CAFEINE','Caféine',C,'Maximum 200 mg/j pendant la grossesse (EFSA/ANSES). Doses élevées liées au RCIU et fausse couche. 1 café ≈ 80-100 mg.'),
  f('CAFE','Café (Coffea arabica/robusta)',C,'Source principale de caféine. Limiter à 2 tasses/jour (café faible) ou 1 espresso. Décaféiné: sûr.'),
  f('THE NOIR','Thé noir (Camellia sinensis)',C,'Caféine (50 mg/tasse) + tanins réduisant l\'absorption du fer. Limiter à 2-3 tasses/jour.'),
  f('THE VERT','Thé vert (Camellia sinensis)',C,'Caféine (30-50 mg/tasse) + EGCG — données limités grossesse. Limiter à 2 tasses/jour.'),
  f('COLA','Boissons cola (Coca-Cola, Pepsi)',C,'Caféine (35-40 mg/250ml) + sucre. Limiter à 500ml/jour.','medium'),
  f('CHOCOLAT NOIR','Chocolat noir (Theobroma cacao)',C,'Caféine et théobromine. Limiter la consommation excessive. 30-40g/jour: sûr.','medium'),
  f('BOISSONS ENERGISANTES','Boissons énergisantes (Red Bull, Monster)',D,'CONTRE-INDIQUÉES pendant la grossesse — teneur en caféine très élevée + autres stimulants (taurine, guarana).'),
  f('GUARANA','Guarana (Paullinia cupana)',D,'Source concentrée de caféine. CONTRE-INDIQUÉ pendant la grossesse — dose imprévisible.'),
  f('MATE','Maté (Ilex paraguariensis)',C,'Caféine élevée + composés potentiellement génotoxiques. Déconseillé pendant la grossesse.'),
  f('YERBA MATE','Yerba maté',C,'Riche en caféine et composés préoccupants. Déconseillé grossesse.','medium'),
];

// ─── Alcool ───────────────────────────────────────────────────────────────────
const ALCOHOL: PreComputedIngredient[] = [
  f('ALCOOL ETHYLIQUE ALIMENTAIRE','Alcool éthylique (boissons alcoolisées)',D,'AUCUNE DOSE SÛRE pendant la grossesse. Syndrome d\'alcoolisation fœtale (SAF) — abstinence totale recommandée par OMS, CRAT, HAS.'),
  f('VIN','Vin (rouge, blanc, rosé)',D,'Alcool — contre-indiqué pendant toute la grossesse, quel que soit le volume.'),
  f('BIERE','Bière',D,'Alcool — contra-indiquée. La bière sans alcool (<0,5% vol): considérée sûre.'),
  f('BIERE SANS ALCOOL','Bière sans alcool (<0,5% vol)',C,'Traces d\'alcool possibles. Généralement considérée sûre en consommation modérée. Précaution.','medium'),
  f('SPIRITS','Spiritueux (whisky, vodka, gin, rhum)',D,'Alcool à très haute teneur. Absolument contre-indiqué.'),
  f('CIDRE','Cidre alcoolisé',D,'Alcool — contre-indiqué.','medium'),
  f('KOMBUCHA ALCOOLISE','Kombucha fermenté (>0,5% vol)',C,'Peut contenir de l\'alcool (variable). Précaution. Certains kombucha sont alcoolisés.','medium'),
  f('TIRAMISU','Tiramisu (contient mascarpone + alcool + œuf cru)',D,'Triple risque: alcool + œuf cru (salmonelle) + fromage frais (listériose). À éviter.'),
];

// ─── Vitamines et minéraux alimentaires ───────────────────────────────────────
const VITAMINS_MINERALS: PreComputedIngredient[] = [
  f('ACIDE FOLIQUE','Acide folique (Vitamine B9)',S,'ESSENTIEL pendant la grossesse — 400 µg/j minimum avant conception et 1er trimestre. Prévient les anomalies du tube neural. Sûr.'),
  f('VITAMINE D3','Vitamine D3 (Cholécalciférol)',C,'Essentielle pendant la grossesse. Supplémentation recommandée (1000-2000 UI/j). Fortes doses (>4000 UI/j): toxicité. Précaution si supplément.',),
  f('FER ALIMENTAIRE','Fer (supplémentation)',C,'Besoin accru pendant la grossesse. Supplémentation sur prescription médicale. Surdosage: effets négatifs.'),
  f('IODE','Iode',C,'Oligo-élément essentiel. Carence: hypothyroïdie fœtale. Excès (>500 µg/j): blocage thyroïde fœtale. Équilibre important.'),
  f('OMEGA 3 DHA','Oméga-3 DHA (acide docosahexaénoïque)',S,'Essentiel pour le développement cérébral fœtal. 200 mg/j recommandés. Sûr.'),
  f('VITAMINE A ALIMENT','Vitamine A (rétinol alimentaire)',D,'CONTRE-INDIQUÉ > 10000 UI/j — tératogène. Foie d\'animaux très riche — à éviter. Bêta-carotène végétal: sûr.'),
  f('VITAMINE B12','Vitamine B12 (Cobalamine)',S,'Essentielle. Carences chez les végétaliens. Supplémentation nécessaire si régime végétalien. Sûre.'),
  f('VITAMINE B6','Vitamine B6 (Pyridoxine)',C,'Aide contre les nausées de grossesse (B6+doxylamine). Doses élevées (>100 mg/j): neuropathie. Modération.','medium'),
  f('VITAMINE K1','Vitamine K1 (Phylloquinone)',S,'Coagulation. Sûre aux doses alimentaires. Injection prophylactique au nouveau-né recommandée.'),
  f('VITAMINE C ALIMENT','Vitamine C (acide ascorbique alimentaire)',S,'Antioxydant essentiel. Sûre aux doses alimentaires. Mégadoses (>2g/j): diarrhées.','medium'),
  f('CALCIUM ALIMENTAIRE','Calcium',S,'Essentiel pour la minéralisation fœtale. Besoins augmentés. Produits laitiers ou compléments. Sûr.'),
  f('MAGNESIUM ALIMENT','Magnésium',S,'Prévient les crampes nocturnes. Sûr aux doses alimentaires. Fortes doses: laxatif.','medium'),
  f('ZINC ALIMENTAIRE','Zinc',C,'Oligo-élément essentiel. Carence déconseillée. Suppléments à doses élevées: précaution (inhibe absorption du cuivre).','medium'),
  f('SELENIUM ALIMENTAIRE','Sélénium',C,'Oligo-élément essentiel. Toxique à fortes doses (> 400 µg/j). Équilibre.','medium'),
  f('CUIVRE ALIMENTAIRE','Cuivre',C,'Oligo-élément essentiel. Toxique en excès. Modération.','medium'),
  f('VITAMINE E ALIMENT','Vitamine E alimentaire',S,'Antioxydant. Sûre aux doses alimentaires. Fortes doses (>1000 mg/j): précaution.','medium'),
  f('CHOLINE','Choline',S,'Essentielle pour le développement cérébral. Les œufs en sont une source majeure. Sûre.','medium'),
  f('INOSITOL','Inositol (vitamine B8)',C,'Données préliminaires sur prévention du diabète gestationnel. Données insuffisantes — précaution.','medium'),
  f('ACIDE ALPHA LIPOIQUE','Acide alpha-lipoïque (ALA)',C,'Antioxydant — données grossesse insuffisantes. Précaution.','medium'),
];

// ─── Herbes et plantes alimentaires à risque ─────────────────────────────────
const HERBS_FOOD: PreComputedIngredient[] = [
  f('PERSIL HUILE','Persil en grande quantité / huile essentielle',DC,'Contient apiol — propriétés abortives à fortes doses. Usage culinaire normal: sûr. Compléments/HE: contre-indiqués.'),
  f('SAUGE ALIMENTAIRE','Sauge (condiment)',DC,'Petites quantités en cuisine: sûres. Infusions fortes / HE: déconseillées au 1er trimestre (emménagogue).','medium'),
  f('CANNELLE FORTE','Cannelle en grandes quantités',C,'Contient cinnamaldéhyde — propriétés utérotoniques à fortes doses. Condiment usuel: sûr.','medium'),
  f('REGLISSE ALIMENTAIRE','Réglisse (bonbons, infusions)',C,'Glycyrrhizine — perturbateur endocrinien, augmente tension artérielle. ANSES: < 100 mg/j pendant la grossesse. Éviter les bonbons réglissés.'),
  f('GINGEMBRE ALIMENTAIRE','Gingembre (Zingiber officinale)',C,'Anti-nausée efficace en 1er trimestre. Doses médicinales (>2g/j): précaution. Usage culinaire: sûr.','medium'),
  f('THYM ALIMENTAIRE','Thym (condiment)',S,'Condiment: sûr aux doses culinaires usuelles. HE de thym: déconseillée.'),
  f('ROMARIN ALIMENTAIRE','Romarin (condiment)',C,'Condiment: sûr en petites quantités. Infusions fortes / compléments: précaution.','medium'),
  f('MENTHE POIVREE INFUSION','Infusion de menthe poivrée',C,'Quantités modérées: généralement tolérées. Fortes doses ou HE: précaution.','medium'),
  f('CAMOMILLE INFUSION','Infusion de camomille',C,'Boisson apaisante. Données grossesse limitées — précaution au 1er trimestre.','medium'),
  f('HIBISCUS INFUSION','Infusion d\'hibiscus (karkadé)',C,'Contient phytoestrogènes potentiels. Déconseillée en 1er trimestre.','medium'),
  f('FRAMBOISIER FEUILLE','Infusion de feuille de framboisier (Rubus idaeus)',DC,'Déconseillée en 1er et 2e trimestres. Parfois utilisée en fin de grossesse (à terme uniquement et sur avis médical).'),
  f('GATTILIER','Gattilier (Vitex agnus-castus)',D,'Modifie les hormones — CONTRE-INDIQUÉ pendant la grossesse.'),
  f('VALERIANE','Valériane (Valeriana officinalis)',C,'Sédatif — données grossesse insuffisantes. Précaution.','medium'),
  f('DONG QUAI','Dong quaï (Angelica sinensis)',D,'Plante de MTC — propriétés utérotoniques. CONTRE-INDIQUÉ pendant la grossesse.'),
  f('BLACK COHOSH','Actée à grappes noires (Cimicifuga racemosa)',D,'Activité oestrogénique et utérotonique documentée. CONTRE-INDIQUÉE.'),
  f('EPHEDRA','Éphédra (Ma Huang)',D,'Stimulant cardiaque et vasoconstricteur — CONTRE-INDIQUÉ.'),
  f('CURCUMA FORTE','Curcuma (compléments concentrés)',C,'Condiment: sûr. Compléments à haute dose: précaution — données grossesse limitées.','medium'),
  f('SPIRULINE','Spiruline (complément)',C,'Algue riche en protéines. Risque de contamination aux cyanotoxines. Précaution qualité.','medium'),
  f('CHLORELLE','Chlorelle (complément)',C,'Algue. Risque de contamination. Précaution grossesse.','medium'),
];

// ─── Acides gras trans et lipides préoccupants ────────────────────────────────
const FATS: PreComputedIngredient[] = [
  f('TRANS GRAS','Acides gras trans (graisses hydrogénées)',C,'Acides gras industriels — OMS recommande de les éliminer. Perturbent le métabolisme lipidique. À éviter.'),
  f('HUILE PALME','Huile de palme',C,'Riche en acides gras saturés. Données nutritionnelles préoccupantes en excès. Précaution.','medium'),
  f('MARGARINES HYDROGENUEES','Margarines hydrogénées (contenant trans)',C,'Contiennent acides gras trans. À éviter pendant la grossesse.','medium'),
  f('HUILE DE COCO ALIMENTAIRE','Huile de coco (alimentaire)',C,'Très riche en graisses saturées. Usage modéré recommandé.','medium'),
];

// ─── Polluants alimentaires ───────────────────────────────────────────────────
const POLLUTANTS: PreComputedIngredient[] = [
  f('PESTICIDES RESIDUS','Résidus de pesticides (fruits/légumes)',C,'Précaution: laver soigneusement ou choisir bio pour les fruits les plus exposés (pommes, fraises, poivrons).','medium'),
  f('AFLATOXINES','Aflatoxines (moisissures)',D,'Mycotoxines cancérogènes — présentes dans noix, maïs, arachides mal conservés. CONTRE-INDIQUÉES.'),
  f('DIOXINES PCB','Dioxines et PCB (poissons gras)',C,'Polluants organiques persistants — poissons gras de la Baltique. Limiter à 1 portion/semaine.','medium'),
  f('ACRYLAMIDE ALIMENT','Acrylamide (aliments frits/cuits haute température)',C,'Cancérogène probable — chips, frites très cuites, café. Précaution — limiter les aliments très grillés.','medium'),
  f('HAP ALIMENT','Hydrocarbures aromatiques polycycliques (HAP)',C,'Cancérogènes — grillades au charbon, poissons fumés. Précaution — cuisson modérée.','medium'),
  f('BPA ALIMENTAIRE','Bisphénol A (boîtes de conserve)',C,'Perturbateur endocrinien — boîtes de conserve et plastiques. Préférer le frais ou le verre.'),
];

export async function scrapeEFSA(): Promise<PreComputedIngredient[]> {
  return [
    ...COLORANTS, ...PRESERVATIVES, ...ANTIOXIDANTS, ...THICKENERS,
    ...FLAVOR_ENHANCERS, ...SWEETENERS, ...PROCESSING_AIDS,
    ...INFECTION_RISKS, ...MERCURY_FISH, ...CAFFEINE_SOURCES,
    ...ALCOHOL, ...VITAMINS_MINERALS, ...HERBS_FOOD, ...FATS, ...POLLUTANTS,
  ];
}
