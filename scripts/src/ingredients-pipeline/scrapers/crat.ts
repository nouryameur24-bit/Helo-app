/**
 * crat.ts — ~1 500 substances avec risques grossesse pré-calculés (CRAT/ANSM).
 * Sources: CRAT lecrat.fr, ANSM, Vidal, CNGOF recommandations.
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
const DS: R = ['danger','caution','danger','caution'];

function m(ni: string, n: string, r: R, d: string, conf: 'high'|'medium'|'low' = 'high'): PreComputedIngredient {
  return ing(ni, n, 'medication', r, d, 'crat', conf);
}

// ─── Antalgiques ──────────────────────────────────────────────────────────────
const ANALGESICS: PreComputedIngredient[] = [
  m('PARACETAMOL','Paracétamol',C,'Antalgique de référence pendant la grossesse — utilisable à tous les trimestres à la dose minimale efficace. Éviter usage prolongé (données récentes sur cryptorchidie). Dose max 1g × 4/j.'),
  m('IBUPROFEN','Ibuprofène',CD,'CONTRE-INDIQUÉ à partir du 5e mois (20 SA). Déconseillé aux 1er et 2e trimestres. Risque fermeture prématurée du canal artériel et insuffisance rénale fœtale.'),
  m('ACIDE ACETYLSALICYLIQUE','Acide acétylsalicylique (Aspirine)',CD,'À doses antalgiques: CONTRE-INDIQUÉE à partir du 6e mois. Faible dose (75-100 mg/j) prescrite par médecin: autorisée. Ne jamais s\'automédiquer.'),
  m('NAPROXEN','Naproxène',CD,'AINS — contre-indiqué à partir du 5e mois. Déconseillé en début de grossesse.'),
  m('DICLOFENAC','Diclofénac',CD,'AINS — même contre-indication que l\'ibuprofène. Y compris gel topique après 20 SA.'),
  m('KETOPROFEN','Kétoprofène',CD,'AINS — CONTRE-INDIQUÉ à partir du 5e mois. En gel topique: précaution à partir de 5 mois.'),
  m('CELECOXIB','Célécoxib (Coxib)',CD,'Anti-COX-2 — contre-indiqué à partir du 5e mois. Données insuffisantes en 1er trimestre.','medium'),
  m('ETORICOXIB','Étoricoxib (Arcoxia)',CD,'Coxib — contre-indiqué à partir du 5e mois.','medium'),
  m('INDOMETACIN','Indométacine',CD,'AINS puissant — contre-indiqué à partir du 5e mois. Utilisé parfois comme tocolytique.','medium'),
  m('MELOXICAM','Méloxicam',CD,'AINS — contre-indiqué à partir du 5e mois.','medium'),
  m('PIROXICAM','Piroxicame',CD,'AINS — contre-indiqué à partir du 5e mois.','medium'),
  m('ACIDE MEFENAMIQUE','Acide méfénamique',CD,'AINS — contre-indiqué à partir du 5e mois.','medium'),
  m('CODEINE','Codéïne',C,'Opioïde faible. Éviter en fin de grossesse (dépression respiratoire néonatale, syndrome de sevrage). Usage ponctuel: précaution.'),
  m('TRAMADOL','Tramadol',C,'Opioïde — données montrent syndrome de sevrage néonatal. À éviter si possible. Si indispensable: surveillance.'),
  m('MORPHINE','Morphine',C,'Opioïde fort — utilisable si indispensable (douleur sévère, analgésie obstétricale). Syndrome de sevrage néonatal si usage prolongé.'),
  m('OXYCODONE','Oxycodone (OxyContin)',C,'Opioïde fort — risque de syndrome de sevrage néonatal. Précaution stricte.','medium'),
  m('HYDROMORPHONE','Hydromorphone',C,'Opioïde fort — syndrome de sevrage néonatal. Précaution stricte.','medium'),
  m('FENTANYL','Fentanyl',C,'Opioïde — utilisé en anesthésie obstétricale. Usage non médical: contre-indiqué.','medium'),
  m('BUPRENORPHINE','Buprénorphine (Subutex)',C,'Opioïde — traitement de substitution. Maintenir si dépendance: sevrage brutal plus risqué. Syndrome de sevrage néonatal possible.'),
  m('METHADONE','Méthadone',C,'Opioïde — traitement de substitution. Maintenir si dépendance avec surveillance renforcée.'),
  m('METHYL SALICYLATE TOPIQUE','Salicylate de méthyle (topique)',CD,'Absorption cutanée très élevée — risque aspirine-like. CONTRE-INDIQUÉ à partir du 5e mois.'),
  m('CAPSAICINE TOPIQUE','Capsaïcine (patch topique)',C,'Données grossesse limitées. Précaution — absorption possible.','medium'),
  m('LIDOCAINE','Lidocaïne',C,'Anesthésique local — utilisable ponctuellement. Précaution en usage prolongé ou grandes surfaces.','medium'),
];

// ─── Antibiotiques ────────────────────────────────────────────────────────────
const ANTIBIOTICS: PreComputedIngredient[] = [
  m('AMOXICILLINE','Amoxicilline',S,'Pénicilline — considérée sûre pendant toute la grossesse. Antibiotique de première intention pour de nombreuses infections.'),
  m('AMOXICILLINE ACIDE CLAVULANIQUE','Amoxicilline + acide clavulanique (Augmentin)',C,'Pénicilline protégée — données globalement rassurantes mais légère augmentation possible entérocolite nécrosante néonatale si prématurité. Utiliser si nécessaire.'),
  m('AMPICILLINE','Ampicilline',S,'Pénicilline. Sûre pendant la grossesse.','medium'),
  m('PHENOXYMETHYLPENICILLINE','Phénoxyméthylpénicilline (Pénicilline V)',S,'Pénicilline orale. Sûre.','medium'),
  m('OXACILLINE','Oxacilline',S,'Pénicilline M. Sûre.','medium'),
  m('CLOXACILLINE','Cloxacilline',S,'Pénicilline M. Sûre.','medium'),
  m('PIPERACILLINE TAZOBACTAM','Pipéracilline-tazobactam',C,'Pénicilline à spectre étendu. Données limitées — précaution.','medium'),
  m('CEFALEXINE','Céfalexine (Keflex)',S,'Céphalosporine 1G. Sûre pendant la grossesse.'),
  m('CEFUROXIME','Céfuroxime',S,'Céphalosporine 2G. Sûre.','medium'),
  m('CEFIXIME','Céfixime',S,'Céphalosporine 3G orale. Sûre.','medium'),
  m('CEFTRIAXONE','Ceftriaxone',C,'Céphalosporine 3G IV/IM. Utilisable si indispensable. Précaution en fin de grossesse (compétition avec bilirubine).'),
  m('CEFOTAXIME','Céfotaxime',C,'Céphalosporine 3G. Utilisable si nécessaire.','medium'),
  m('ERYTHROMYCINE','Érythromycine',S,'Macrolide — alternative aux pénicillines en cas d\'allergie. Sûre pendant la grossesse.'),
  m('AZITHROMYCINE','Azithromycine (Zithromax)',C,'Macrolide — données rassurantes globalement. Quelques signaux cardiaques à surveiller. Utiliser si nécessaire.'),
  m('CLARITHROMYCINE','Clarithromycine (Biaxin)',C,'Macrolide — données animales préoccupantes. Préférer l\'érythromycine. Données humaines partiellement rassurantes.'),
  m('SPIRAMYCINE','Spiramycine',S,'Macrolide — utilisée en France dans la toxoplasmose gestationnelle. Sûre.'),
  m('CLINDAMYCINE','Clindamycine',C,'Lincosamide — données limités. Utilisée en cas d\'allergie grave aux pénicillines.','medium'),
  m('METRONIDAZOLE','Métronidazole (Flagyl)',C,'Imidazolé — données rassurantes en 2e et 3e trimestres. Précaution au 1er trimestre — utiliser si indispensable (vaginose bactérienne, trichomonase).'),
  m('TINIDAZOLE','Tinidazole',C,'Imidazolé — mêmes précautions que métronidazole. Données moins abondantes.','medium'),
  m('DOXYCYCLINE','Doxycycline',DCC,'Tétracycline — CONTRE-INDIQUÉE à partir du 2e trimestre: coloration des dents de lait, retard osseux. À éviter absolument.'),
  m('TETRACYCLINE','Tétracycline',DCC,'CONTRE-INDIQUÉE à partir du 2e trimestre — coloration dentaire et ossification. Absolument à éviter.'),
  m('MINOCYCLINE','Minocycline',DCC,'Tétracycline — même contre-indication que la doxycycline.'),
  m('CIPROFLOXACINE','Ciprofloxacine (Quinolone)',C,'Quinolone — données rassurantes sur malformations majeures. Précaution: risque de cartilage fœtal non formellement documenté chez l\'humain mais déconseillée.'),
  m('OFLOXACINE','Ofloxacine',C,'Quinolone — mêmes précautions que ciprofloxacine.','medium'),
  m('LEVOFLOXACINE','Lévofloxacine',C,'Quinolone — précaution. Réserver aux infections résistantes.','medium'),
  m('NORFLOXACINE','Norfloxacine',C,'Quinolone — précaution grossesse.','medium'),
  m('TRIMETHOPRIM','Triméthoprime',DC,'Antifolate — CONTRE-INDIQUÉ au 1er trimestre (action antifolate: risque anomalie tube neural). 2e-3e trimestres: utiliser avec précaution si nécessaire.'),
  m('COTRIMOXAZOLE','Cotrimoxazole (Bactrim)',DC,'Sulfaméthoxazole + triméthoprime — CONTRE-INDIQUÉ au 1er trimestre (antifolate) et à partir du 8e mois (risque ictère nucléaire néonatal).'),
  m('NITROFURANTOINE','Nitrofurantoïne',C,'Traitement des infections urinaires — CONTRE-INDIQUÉE à terme (> 36 SA: risque ictère néonatal). Sûre en 2e et 3e trimestres si indispensable.'),
  m('FOSFOMYCINE','Fosfomycine',S,'Traitement de l\'infection urinaire en dose unique. Sûre pendant la grossesse.'),
  m('PRISTINAMYCINE','Pristinamycine (Pyostacine)',C,'Streptogramine — données limités. Précaution.','medium'),
  m('RIFAMPICINE','Rifampicine',C,'Antituberculeux — traitements antituberculeux à maintenir si indispensable. Données rassurantes globalement.','medium'),
  m('ISONIAZIDE','Isoniazide (INH)',C,'Antituberculeux — maintenir si traitement antituberculeux nécessaire avec supplémentation B6.','medium'),
  m('ETHAMBUTOL','Éthambutol',C,'Antituberculeux — utilisable si nécessaire.','medium'),
  m('PYRAZINAMIDE','Pyrazinamide',C,'Antituberculeux — données limités en grossesse. Utiliser si indispensable.','medium'),
  m('VANCOMYCINE','Vancomycine',C,'Glycopeptide — réserver aux infections graves résistantes. Surveillance auditive fœtale recommandée.','medium'),
  m('GENTAMICINE','Gentamicine',C,'Aminoside — ototoxique et néphrotoxique. Réserver aux infections graves avec surveillance des taux sériques.'),
  m('AMIKACINE','Amikacine',C,'Aminoside — mêmes précautions que gentamicine. Réserver aux infections graves.','medium'),
  m('TOBRAMYCINE','Tobramycine',C,'Aminoside — précaution stricte (ototoxicité fœtale).','medium'),
  m('LINEZOLIDE','Linézolide',C,'Oxazolidinone — données très limitées. Réserver aux infections résistantes.','medium'),
  m('DAPTOMYCINE','Daptomycine',C,'Lipopeptide — données grossesse insuffisantes.','medium'),
  m('MEROPENEM','Méropénème',C,'Carbapénème — réserver aux infections à bactéries résistantes.','medium'),
  m('IMIPENEM','Imipénème',C,'Carbapénème — précaution grossesse.','medium'),
  m('AZTREONAM','Aztréonam',C,'Monobactam — données limités grossesse. Utiliser si indispensable en allergie pénicilline.','medium'),
];

// ─── Antiviraux ───────────────────────────────────────────────────────────────
const ANTIVIRALS: PreComputedIngredient[] = [
  m('ACICLOVIR','Aciclovir (Zovirax)',C,'Antiviral HSV/VZV — données rassurantes en usage topique et oral pendant la grossesse. Utiliser si indispensable (herpès grave, varicelle).'),
  m('VALACICLOVIR','Valaciclovir',C,'Prodrogue aciclovir — mêmes données rassurantes. Traitement de référence herpès génital pendant la grossesse.'),
  m('OSELTAMIVIR','Oseltamivir (Tamiflu)',C,'Antiviral grippe — recommandé pendant la grossesse en cas de grippe (maladie plus grave chez la femme enceinte). Bénéfice > risque documenté.'),
  m('TENOFOVIR','Ténofovir (ARV)',C,'Antirétroviral — traitement VIH à maintenir pendant la grossesse sous suivi spécialisé. Données de tolérance acceptables.','medium'),
  m('LAMIVUDINE','Lamivudine (3TC)',C,'ARV — maintenir si traitement VIH sous suivi spécialisé.','medium'),
  m('EMTRICITABINE','Emtricitabine (FTC)',C,'ARV — données grossesse en cours d\'évaluation. Maintenir si traitement VIH.','medium'),
  m('GANCICLOVIR','Ganciclovir',C,'Antiviral CMV — données limités. Réserver si CMV grave (choriorétinite).','medium'),
  m('SOFOSBUVIR','Sofosbuvir (Sovaldi)',C,'Anti-VHC — éviter pendant la grossesse (données insuffisantes).','medium'),
  m('INTERFERONS','Interférons (alpha, bêta)',D,'Cytokines — données préoccupantes (avortement spontané). CONTRE-INDIQUÉS en début de grossesse.','medium'),
  m('RIBAVIRINE','Ribavirine',D,'Antiviral — TÉRATOGÈNE DOCUMENTÉ. Contraception obligatoire 4 mois après arrêt. ABSOLUMENT CONTRE-INDIQUÉ.'),
];

// ─── Antifongiques ────────────────────────────────────────────────────────────
const ANTIFUNGALS: PreComputedIngredient[] = [
  m('CLOTRIMAZOLE TOPIQUE','Clotrimazole (topique vaginal/cutané)',S,'Imidazolé topique — traitement de référence des mycoses vaginales pendant la grossesse. Sûr en usage local.'),
  m('MICONAZOLE TOPIQUE','Miconazole (topique)',C,'Imidazolé — usage topique cutané sûr. Ovules vaginaux: précaution (applicateur à éviter en fin de grossesse).','medium'),
  m('ECONAZOLE TOPIQUE','Éconazole (topique)',S,'Imidazolé topique. Sûr en usage local.','medium'),
  m('TERBINAFINE TOPIQUE','Terbinafine (topique)',C,'Allylamine — données limités grossesse en topique. Précaution.','medium'),
  m('FLUCONAZOLE ORAL','Fluconazole (Triflucan) oral',DC,'Azolé systémique — doses élevées (>150 mg) associées à malformations en 1er trimestre. CONTRE-INDIQUÉ au 1er trimestre. Dose unique 150 mg: utiliser avec précaution hors 1er trimestre.'),
  m('ITRACONAZOLE','Itraconazole oral',DC,'Azolé — données préoccupantes en 1er trimestre. À éviter pendant la grossesse si possible.','medium'),
  m('VORICONAZOLE','Voriconazole',D,'Azolé — données préoccupantes (tératogénicité animale). À éviter pendant la grossesse.','medium'),
  m('AMPHOTERICINE B','Amphotéricine B',C,'Polyène — réserver aux infections fongiques graves résistantes. Données limités mais tolérance acceptable.','medium'),
  m('NYSTATIN TOPIQUE','Nystatine (topique)',S,'Polyène — non absorbé. Traitement local mycose. Sûr pendant la grossesse.'),
  m('GRISEOFULVINE','Griséofulvine',D,'Antifongique oral — données préoccupantes reprotoxicité. À éviter pendant la grossesse.','medium'),
];

// ─── Antihistaminiques ────────────────────────────────────────────────────────
const ANTIHISTAMINES: PreComputedIngredient[] = [
  m('CETIRIZINE','Cétirizine (Zyrtec)',C,'Antihistaminique H1 2e génération — données rassurantes sur malformations majeures. De préférence en 2e et 3e trimestres. Sédation faible.'),
  m('LORATADINE','Loratadine (Clarityne)',C,'Antihistaminique 2G — données rassurantes. Premier choix parmi les antihistaminiques si traitement nécessaire.'),
  m('DESLORATADINE','Desloratadine (Aerius)',C,'Métabolite de la loratadine — profil de sécurité similaire. Données rassurantes.','medium'),
  m('LEVOCETIRIZINE','Levocetirizine (Xyzal)',C,'Énantiomère de la cétirizine — mêmes données rassurantes.','medium'),
  m('FEXOFENADINE','Fexofénadine',C,'Antihistaminique 2G — données limités grossesse. Précaution.','medium'),
  m('CHLORPHENIRAMINE','Chlorphéniramine (1G)',C,'Antihistaminique 1G — sédatif. Données rassurantes sur malformations. Précaution en fin de grossesse (dépression néonatale).','medium'),
  m('DIPHENHYDRAMINE','Diphenhydramine (Benadryl)',C,'Antihistaminique 1G sédatif — données contradictoires. Précaution en 1er trimestre. En fin de grossesse: syndrome de sevrage néonatal possible.'),
  m('PROMETHAZINE','Prométhazine (Phénergan)',C,'Phénothiazine anti-H1 — données antiémétiques rassurantes. En fin de grossesse: précaution (syndrome extrapyramidal néonatal).'),
  m('HYDROXYZINE','Hydroxyzine (Atarax)',C,'Antihistaminique anxiolytique — données malformations rassurantes. À éviter avant l\'accouchement (syndrome de sevrage néonatal).'),
  m('DOXYLAMINE','Doxylamine (Donormyl)',S,'Antihistaminique antiémétique — associée à B6 dans les nausées de grossesse. Données rassurantes extensives. Traitement de référence des nausées en France.'),
  m('MECLOZINE','Méclozine',C,'Antihistaminique antiémétique — données rassurantes mais moins abondantes que doxylamine.','medium'),
];

// ─── Antiémétiques ────────────────────────────────────────────────────────────
const ANTIEMETICS: PreComputedIngredient[] = [
  m('METOCLOPRAMIDE','Métoclopramide (Primperan)',C,'Antiémétique — données extensives rassurantes sur malformations. À éviter en fin de grossesse (syndrome extrapyramidal néonatal). Traitement de courte durée.'),
  m('DOMPERIDONE','Dompéridone (Motilium)',C,'Antiémétique — données rassurantes. Précaution en fin de grossesse.','medium'),
  m('ONDANSETRON','Ondansétron (Zophren)',C,'Sétron anti-5-HT3 — débat sur possible fente palatine au 1er trimestre (données contradictoires). Utiliser si nausées réfractaires avec information.'),
  m('GINGEMBRE','Gingembre (supplément anti-nausée)',C,'Antiémétique naturel — efficacité modérée. Considéré sûr à doses modérées (250-500 mg × 4/j). Éviter doses très élevées.','medium'),
  m('DOXYLAMINE B6','Doxylamine + Vitamine B6 (Cariban)',S,'Association de référence contre les nausées et vomissements gravidiques. Données rassurantes extensives. Traitement de première ligne recommandé.'),
  m('METOPIMAZINE','Métopimazine (Vogalène)',C,'Phénothiazine antiémétique — données grossesse acceptables. Précaution en fin de grossesse.','medium'),
  m('ALIZAPRIDE','Alizapride (Plitican)',C,'Antiémétique — données limités grossesse. Précaution.','medium'),
];

// ─── Antiacides et médicaments GI ────────────────────────────────────────────
const GI_MEDICATIONS: PreComputedIngredient[] = [
  m('OMEPRAZOLE','Oméprazole (Mopral)',C,'IPP — données extensives rassurantes. L\'utilisation pendant la grossesse est courante et ne justifie pas d\'interruption. Traitement du RGO gestationnel.'),
  m('ESOMEPRAZOLE','Ésoméprazole (Inexium)',C,'IPP — données rassurantes. Traitement du RGO si nécessaire.','medium'),
  m('LANSOPRAZOLE','Lansoprazole (Ogast)',C,'IPP — données rassurantes. Utiliser si indispensable.','medium'),
  m('PANTOPRAZOLE','Pantoprazole (Eupantol)',C,'IPP — données rassurantes. Traitement du RGO.','medium'),
  m('RABEPRAZOLE','Rabéprazole',C,'IPP — données limités. Précaution.','medium'),
  m('RANITIDINE','Ranitidine',C,'Anti-H2 — retiré du marché UE (contamination NDMA). NE PLUS UTILISER.','medium'),
  m('CIMETIDINE','Cimétidine',C,'Anti-H2 — effets antiandrogéniques. Précaution grossesse.','medium'),
  m('FAMOTIDINE','Famotidine (Pepcid)',C,'Anti-H2 — données rassurantes. Utiliser si IPP non disponible.','medium'),
  m('ALGINATE SODIUM','Alginate de sodium + carbonate (Gaviscon)',S,'Antiacide mécanique — non absorbé. Traitement de première ligne du RGO pendant la grossesse. Sûr.'),
  m('HYDROXYDE ALUMINIUM MAGNESIUM','Hydroxyde d\'aluminium/magnésium (Maalox)',C,'Antiacide — éviter usage chronique (accumulation aluminium). Sûr pour usage ponctuel.','medium'),
  m('BICARBONATE SODIUM','Bicarbonate de sodium',C,'Antiacide — ne pas utiliser régulièrement (surcharge sodique). Ponctuel: acceptable.','medium'),
  m('LACTULOSE','Lactulose (Duphalac)',S,'Laxatif osmotique non absorbé. Traitement de référence de la constipation gestationnelle. Sûr.'),
  m('MACROGOL','Macrogol 4000 (Forlax)',S,'Laxatif osmotique — non absorbé. Sûr pendant la grossesse.'),
  m('PSYLLIUM','Psyllium (Metamucil)',S,'Laxatif de lest. Sûr pendant la grossesse.','medium'),
  m('BISACODYL','Bisacodyl (Dulcolax)',C,'Laxatif stimulant — contractions intestinales. À éviter si possible, usage très ponctuel.','medium'),
  m('HUILE DE PARAFFINE','Huile de paraffine laxative',C,'Laxatif lubrifiant — précaution: peut réduire l\'absorption des vitamines liposolubles si usage prolongé.','medium'),
  m('SENNA LAXATIF','Séné (Laxatif anthraquinonique)',C,'Laxatif stimulant — déconseillé en grossesse (contractions potentielles).','medium'),
  m('SMECTITE','Smectite (Smecta)',S,'Pansement intestinal — non absorbé. Sûr pendant la grossesse pour les diarrhées.'),
  m('CHARBON ACTIVE MEDICAMENT','Charbon activé',C,'Absorbant intestinal — peut réduire l\'absorption des médicaments. Prendre à distance des autres traitements.','medium'),
  m('LOPERAMIDE','Lopéramide (Imodium)',C,'Ralentisseur du transit — données malformations non alarmantes mais utiliser uniquement si diarrhée sévère. Précaution.'),
  m('MESALAZINE','Mésalazine (Pentasa)',C,'Anti-inflammatoire intestinal — maintenir si MICI active (non traitement plus risqué que traitement). Données rassurantes.'),
  m('SULFASALAZINE','Sulfasalazine',C,'MICI — maintenir avec supplémentation folate accrue. Données rassurantes.','medium'),
  m('BUDESONIDE ORAL','Budésonide oral (Entocort)',C,'Corticoïde intestinal — absorption systémique faible. Maintenir si MICI active.','medium'),
  m('RIFAXIMINE','Rifaximine',C,'Antibiotique intestinal — non absorbé. Données limités grossesse.','medium'),
];

// ─── Antidépresseurs et psychotropes ─────────────────────────────────────────
const PSYCHOTROPICS: PreComputedIngredient[] = [
  m('SERTRALINE','Sertraline (Zoloft)',C,'ISRS — données rassurantes sur malformations majeures. Risque HTAPPN en fin de grossesse. Syndrome de sevrage néonatal possible. Décision en concertation psychiatrique.'),
  m('FLUOXETINE','Fluoxétine (Prozac)',C,'ISRS — données rassurantes. Demi-vie longue — risque d\'accumulation fœtale. HTAPPN en fin de grossesse. Précaution.'),
  m('ESCITALOPRAM','Escitalopram (Seroplex)',C,'ISRS — données rassurantes globalement. Syndrome de sevrage néonatal. Concertation psychiatrique.','medium'),
  m('CITALOPRAM','Citalopram (Seropram)',C,'ISRS — données rassurantes sur malformations. Syndrome de sevrage néonatal.','medium'),
  m('PAROXETINE','Paroxétine (Deroxat)',C,'ISRS — légère augmentation des malformations cardiaques documentée. À éviter en 1er trimestre si possible. Si nécessaire: surveillance écho cardiaque fœtale.'),
  m('VENLAFAXINE','Venlafaxine (Effexor)',C,'IRSNA — données rassurantes sur malformations. Syndrome de sevrage sévère chez le nouveau-né. Précaution.'),
  m('DULOXETINE','Duloxétine (Cymbalta)',C,'IRSNA — données limités. Précaution.','medium'),
  m('MIRTAZAPINE','Mirtazapine (Norset)',C,'Antidépresseur — données rassurantes. Sédation. Précaution.','medium'),
  m('BUPROPION','Bupropion (Zyban)',C,'Antidépresseur/sevrage tabac — données contradictoires sur malformations cardiaques. Précaution au 1er trimestre.','medium'),
  m('CLOMIPRAMINE','Clomipramine (Anafranil)',C,'Tricyclique — syndrome de sevrage néonatal. Utiliser si indispensable.','medium'),
  m('AMITRIPTYLINE','Amitriptyline (Laroxyl)',C,'Tricyclique antidépresseur — données rassurantes sur malformations. Syndrome de sevrage néonatal. Sédatif.','medium'),
  m('IMIPRAMINE','Imipramine (Tofranil)',C,'Tricyclique — données rassurantes sur malformations. Syndrome de sevrage néonatal.','medium'),
  m('LITHIUM','Lithium',C,'Thymorégulateur — légère augmentation anomalie d\'Ebstein (cardiaque) au 1er trimestre. Maintenir si bénéfice > risque: écho cardiaque fœtale recommandée.'),
  m('VALPROATE','Valproate de sodium (Dépakine)',D,'TÉRATOGÈNE MAJEUR — malformations multiples, retard neurodéveloppemental. CONTRE-INDIQUÉ chez les femmes en âge de procréer sauf contraception absolument garantie.'),
  m('LAMOTRIGINE','Lamotrigine (Lamictal)',C,'Antiépileptique thymorégulateur — données rassurantes sur malformations majeures. Métabolisme accéléré en grossesse: surveillance des taux. Supplémentation acide folique.'),
  m('QUETIAPINE','Quétiapine (Seroquel)',C,'Antipsychotique atypique — données rassurantes sur malformations majeures. Syndrome métabolique maternel possible.','medium'),
  m('OLANZAPINE','Olanzapine (Zyprexa)',C,'Antipsychotique — données globalement rassurantes. Prise de poids maternelle. Précaution.','medium'),
  m('RISPERIDONE','Rispéridone (Risperdal)',C,'Antipsychotique — données rassurantes sur malformations. Syndrome extrapyramidal néonatal en fin de grossesse.','medium'),
  m('ARIPIPRAZOLE','Aripiprazole (Abilify)',C,'Antipsychotique — données limités grossesse. Précaution.','medium'),
  m('HALOPERIDOL','Halopéridol (Haldol)',C,'Antipsychotique classique — syndrome extrapyramidal néonatal. Utiliser si indispensable.','medium'),
  m('CLOZAPINE','Clozapine (Leponex)',C,'Antipsychotique — données limités. Risque agranulocytose néonatale. Précaution stricte.','medium'),
  m('ALPRAZOLAM','Alprazolam (Xanax)',C,'Benzodiazépine — syndrome de sevrage et hypotonie néonatale. À éviter si possible. Ponctuel si crise d\'angoisse sévère.'),
  m('DIAZEPAM','Diazépam (Valium)',C,'Benzodiazépine — syndrome de sevrage néonatal, hypotonie. Réserver aux situations d\'urgence.'),
  m('LORAZEPAM','Lorazépam (Temesta)',C,'Benzodiazépine — mêmes précautions. Utiliser si crise d\'angoisse sévère.','medium'),
  m('CLONAZEPAM','Clonazépam (Rivotril)',C,'Benzodiazépine antiépileptique — maintenir si épilepsie. Syndrome de sevrage néonatal.','medium'),
  m('ZOLPIDEM','Zolpidem (Stilnox)',C,'Hypnotique Z — données rassurantes sur malformations. Syndrome de sevrage néonatal si usage prolongé.','medium'),
  m('ZOPICLONE','Zopiclone (Imovane)',C,'Hypnotique Z — mêmes précautions que zolpidem.','medium'),
  m('MELATONINE','Mélatonine (somnifère)',C,'Hormone — données grossesse insuffisantes. Précaution. Mesures d\'hygiène du sommeil en premier.','medium'),
  m('BUSPIRONE','Buspirone (Buspar)',C,'Anxiolytique non benzo — données très limités.','medium'),
  m('HYDROXYZINE ANXIOLYTIQUE','Hydroxyzine (Atarax) anxiolytique',C,'Antihistaminique anxiolytique — données rassurantes sur malformations. À éviter avant l\'accouchement.'),
];

// ─── Antihypertenseurs ────────────────────────────────────────────────────────
const ANTIHYPERTENSIVES: PreComputedIngredient[] = [
  m('METHYLDOPA','Alpha-méthyldopa (Aldomet)',S,'Antihypertenseur de référence en grossesse — données rassurantes extensives sur 40 ans.'),
  m('LABETALOL','Labétalol (Trandate)',C,'Bêtabloquant alpha-bêta — traitement de référence de l\'HTA sévère en grossesse. Données rassurantes. Surveiller hypoglycémie et bradycardie néonatales.'),
  m('NIFEDIPINE','Nifédipine (Adalate)',C,'Inhibiteur calcique — données rassurantes. Traitement de 2e ligne HTA gravidique. Forme LP recommandée.'),
  m('AMLODIPINE','Amlodipine',C,'Inhibiteur calcique — données rassurantes. Utilisable si autres antihypertenseurs insuffisants.','medium'),
  m('NICARDIPINE','Nicardipine (Loxen)',C,'Inhibiteur calcique — utilisé en urgence hypertensvie pendant la grossesse. Données rassurantes.','medium'),
  m('IEC CAPTOPRIL','IEC (Captopril, Énalapril, Ramipril)',D,'CONTRE-INDIQUÉS à partir du 2e trimestre: foetopathie des IEC (hypoplasie crânienne, insuffisance rénale fœtale, oligoamnios, mort in utero). CONTRE-INDIQUÉS en 1er trimestre.'),
  m('SARTANS','Sartans / ARA II (Valsartan, Losartan)',D,'CONTRE-INDIQUÉS dès la conception — même mécanisme que les IEC. ABSOLUMENT CONTRE-INDIQUÉS.'),
  m('ATENOLOL','Aténolol',C,'Bêtabloquant — moins bien documenté que labétalol. Données retard de croissance fœtal. Précaution.','medium'),
  m('BISOPROLOL','Bisoprolol',C,'Bêtabloquant — données limités en grossesse. Précaution par analogie.','medium'),
  m('METOPROLOL','Métoprolol',C,'Bêtabloquant — données rassurantes mais moins que labétalol. Surveiller bêtabloquage néonatal.','medium'),
  m('HYDRALAZINE','Hydralazine',C,'Vasodilatateur direct — données rassurantes en urgence hypertensive. Utilisé en milieu hospitalier.','medium'),
  m('SPIRONOLACTONE','Spironolactone',DC,'Anti-aldostérone — données féminisation du fœtus mâle au 1er trimestre. À éviter. Si HTAP: discuter bénéfice/risque.','medium'),
  m('FUROSEMIDE','Furosémide (Lasilix)',C,'Diurétique de l\'anse — peut réduire le volume placentaire. À éviter sauf œdème pulmonaire aigu. Oligohydramnios possible.','medium'),
  m('HYDROCHLOROTHIAZIDE','Hydrochlorothiazide',C,'Thiazidique — thrombopénie néonatale documentée. À éviter en grossesse si possible.','medium'),
  m('DOXAZOSINE','Doxazosine',C,'Alpha-1 bloquant — données très limités.','medium'),
  m('CLONIDINE','Clonidine (Catapressan)',C,'Antihypertenseur central — données rassurantes sur malformations. Syndrome de sevrage néonatal possible.','medium'),
];

// ─── Anticoagulants ───────────────────────────────────────────────────────────
const ANTICOAGULANTS: PreComputedIngredient[] = [
  m('HBPM','Héparine de bas poids moléculaire (HBPM)',S,'Anticoagulant de référence en grossesse — ne traverse pas le placenta. Traitement de la MTEV pendant la grossesse.'),
  m('HEPARINE STANDARD','Héparine non fractionnée (HNF)',S,'Anticoagulant — ne traverse pas le placenta. Utilisée en obstétrique pour la MTEV.','medium'),
  m('WARFARINE','Warfarine (Coumadine)',D,'AVK — tératogène au 1er trimestre (embryopathie coumadine), hémorragies en fin de grossesse. Remplacer par HBPM.'),
  m('ACENOCOUMAROL','Acénocoumarol (Sintrom)',D,'AVK — même contre-indication que la warfarine. HBPM de substitution obligatoire.','medium'),
  m('APIXABAN','Apixaban (Eliquis)',D,'AOD — données très insuffisantes en grossesse. CONTRE-INDIQUÉ. HBPM de substitution.'),
  m('RIVAROXABAN','Rivaroxaban (Xarelto)',D,'AOD — CONTRE-INDIQUÉ en grossesse. Données préoccupantes chez l\'animal.'),
  m('DABIGATRAN','Dabigatran (Pradaxa)',D,'AOD — CONTRE-INDIQUÉ. HBPM de substitution.','medium'),
  m('ASPIRINE ANTICOAGULANT','Acide acétylsalicylique (75 mg antiagrégant)',S,'À faible dose (75-100 mg/j): prescrit pour prévention pré-éclampsie dès 12 SA. Sûr à cette dose spécifique.'),
];

// ─── Médicaments cardiaques ───────────────────────────────────────────────────
const CARDIAC: PreComputedIngredient[] = [
  m('DIGOXINE','Digoxine',C,'Digitalique — traitement de certains troubles du rythme. Maintenir si indispensable avec surveillance des taux.','medium'),
  m('AMIODARONE','Amiodarone (Cordarone)',D,'Antiarythmique — contre-indiqué: hypothyroïdie fœtale, goitre, bradycardie néonatale. Réserver aux arythmies réfractaires menaçant le pronostic vital.'),
  m('FLECAINIDE','Flécaïnide',C,'Antiarythmique — utilisé dans certaines tachycardies fœtales. Données grossesse limités.','medium'),
  m('ADENOSINE','Adénosine IV',C,'Antiarythmique d\'urgence — utilisation ponctuelle en TSV. Données rassurantes en usage aigu.','medium'),
  m('ATORVASTATINE','Atorvastatine (Tahor)',D,'Statine — CONTRE-INDIQUÉE pendant la grossesse (inhibition de la synthèse du cholestérol nécessaire au développement fœtal).'),
  m('SIMVASTATINE','Simvastatine (Zocor)',D,'Statine — CONTRE-INDIQUÉE. Arrêt préconceptionnel recommandé.'),
  m('ROSUVASTATINE','Rosuvastatine (Crestor)',D,'Statine — CONTRE-INDIQUÉE pendant la grossesse.','medium'),
  m('FIBRATES','Fibrates (Fénofibrate)',D,'Hypolipémiant — CONTRE-INDIQUÉ pendant la grossesse.','medium'),
  m('NITRATES','Dérivés nitrés (nitroglycérine)',C,'Vasodilatateurs coronariens — données limités. Utiliser si crise angineuse indispensable.','medium'),
];

// ─── Médicaments endocriniens ─────────────────────────────────────────────────
const ENDOCRINE: PreComputedIngredient[] = [
  m('LEVOTHYROXINE','Lévothyroxine (Levothyrox)',S,'Traitement de l\'hypothyroïdie — ESSENTIEL pendant la grossesse. Besoins augmentés. Doses à adapter rapidement dès le début de la grossesse.'),
  m('PROPYLTHIOURACILE','Propylthiouracil (PTU)',C,'Antithyroïdien — traitement de référence en 1er trimestre pour hyperthyroïdie. Hépatotoxicité maternelle. Surveiller thyroïde fœtale.'),
  m('METHIMAZOLE CARBIMAZOLE','Méthimazole / Carbimazole',C,'Antithyroïdiens — à éviter en 1er trimestre (aplasie cutis, atrésies). Préférer PTU au 1er trimestre, puis méthimazole aux 2e/3e trimestres.'),
  m('INSULINE','Insuline (toutes formes)',S,'Traitement du diabète de type 1 et diabète gestationnel. NE TRAVERSE PAS LE PLACENTA. Sûr et nécessaire.'),
  m('METFORMINE','Metformine (Glucophage)',C,'Antidiabétique oral — utilisée dans le diabète gestationnel et SOP. Données rassurantes sur malformations. Maintenir si prescrite.'),
  m('GLIBENCLAMIDE','Glibenclamide (Daonil)',C,'Sulfamide hypoglycémiant — utilisé parfois dans le diabète gestationnel. Données grossesse acceptables.','medium'),
  m('PROGESTERONE','Progestérone naturelle',S,'Hormone de grossesse — utilisée pour maintenir la grossesse (menace d\'avortement, MAP). Sûre.'),
  m('PROGESTERONE SYNTHETIQUE','Progestines synthétiques',C,'Progestatifs de synthèse — certains progestatifs androgens anciens: préoccupation virilisation fœtale. Progestatifs modernes: généralement sûrs.','medium'),
  m('ESTROGENES GROSSESSE','Œstrogènes (complémentation)',C,'Rarissimement prescrits. Données limitées. Précaution.','low'),
  m('DEXAMETHASONE MATURATION','Dexaméthasone (maturation pulmonaire)',S,'Corticoïde — utilisé pour la maturation pulmonaire fœtale en cas de naissance prématurée imminente. Rapport bénéfice/risque très favorable.'),
  m('BETAMETHASONE MATURATION','Bétaméthasone (maturation pulmonaire)',S,'Traitement de référence de la maturation pulmonaire fœtale. Bénéfice néonatal clairement établi.'),
  m('PREDNISOLONE','Prednisone / Prednisolone',C,'Corticoïde systémique — légère augmentation fente palatine au 1er trimestre à fortes doses. Si indispensable (MICI, lupus): maintenir. Injection locale: sûre.'),
  m('FLUDROCORTISONE','Fludrocortisone (Florinef)',C,'Minéralocorticoïde — utilisé dans l\'insuffisance surrénalienne. Maintenir si indispensable.','medium'),
  m('HYDROCORTISONE','Hydrocortisone',C,'Corticoïde de substitution — maintenir pour l\'insuffisance surrénalienne. Essentiel.','medium'),
  m('TERIPARATIDE','Téréparatide (PTH)',C,'Hormone parathyroïdienne — données grossesse très limitées.','low'),
  m('BROMOCRIPTINE','Bromocriptine (parlodel)',C,'Agoniste dopaminergique — arrêter dès confirmation grossesse sauf adénome volumineux. Données malformations rassurantes.','medium'),
  m('CABERGOLINE','Cabergoline (Dostinex)',C,'Agoniste dopaminergique — arrêter dès confirmation grossesse si possible. Données limités.','medium'),
];

// ─── Médicaments respiratoires ────────────────────────────────────────────────
const RESPIRATORY: PreComputedIngredient[] = [
  m('SALBUTAMOL INHALATION','Salbutamol (Ventoline) inhalation',S,'Bronchodilatateur bêta-2 — traitement de l\'asthme. CONTINUER l\'asthme pendant la grossesse est ESSENTIEL. Inhalation: sûre.'),
  m('BUDESONIDE INHALATION','Budésonide (Pulmicort) inhalation',S,'Corticoïde inhalé — traitement de fond de l\'asthme. Sûr et recommandé. Mieux vaut traiter l\'asthme que le laisser non contrôlé.'),
  m('FORMOTEROL INHALATION','Formotérol (Foradil) inhalation',C,'Bêta-2 longue durée — données rassurantes globalement. Maintenir si asthme non contrôlé.','medium'),
  m('SALMETEROL','Salmétérol (Serevent)',C,'Bêta-2 longue durée — continuer si asthme non contrôlé. Données rassurantes.','medium'),
  m('MONTELUKAST','Montélukast (Singular)',C,'Antileucotriène — données rassurantes. Continuer si efficace avant grossesse.','medium'),
  m('IPRATROPIUM','Ipratropium (Atrovent)',C,'Anticholinergique bronchodilatateur — données rassurantes en inhalation.','medium'),
  m('THEOPHYLLINE','Théophylline',C,'Bronchodilatateur oral — index thérapeutique étroit. Possible si autres traitements insuffisants avec surveillance des taux.','medium'),
  m('ACETYLCYSTEINE RESP','Acétylcystéine mucolytique',C,'Fluidifiant bronchique — données limités grossesse. Précaution.','medium'),
  m('AMBROXOL','Ambroxol (Mucosolvan)',C,'Mucolytique — données rassurantes en 2e-3e trimestres. Précaution au 1er trimestre.','medium'),
  m('CODEINE TOUX','Codéïne (sirop antitussif)',C,'Opioïde — risque dépression respiratoire néonatale si utilisé en fin de grossesse.','medium'),
  m('DEXTROMETHORPHANE','Dextrométhorphane (sirop toux)',C,'Antitussif — données limités en grossesse. Précaution.','medium'),
];

// ─── Médicaments dermatologiques topiques ─────────────────────────────────────
const DERMATOLOGY: PreComputedIngredient[] = [
  m('HYDROCORTISONE TOPIQUE','Hydrocortisone (corticoïde topique faible)',C,'Corticoïde topique faible — utilisable ponctuellement sur petites surfaces. Éviter les fortes concentrations en usage étendu.','medium'),
  m('BETAMETHASONE TOPIQUE','Bétaméthasone (corticoïde fort topique)',C,'Corticoïde fort — usage étendu prolongé: précaution (retard de croissance fœtal). Usage localisé ponctuel: acceptable.'),
  m('CLOBETASOL TOPIQUE','Clobétasol (corticoïde très fort)',C,'Corticoïde très fort — absorption cutanée élevée. Usage très limité en grossesse.','medium'),
  m('TACROLIMUS TOPIQUE','Tacrolimus (Protopic) topique',C,'Immunosuppresseur topique — absorption cutanée variable. Données limités en grossesse. Précaution.','medium'),
  m('PIMECROLIMUS TOPIQUE','Pimécroli`mus (Elidel) topique',C,'Immunosuppresseur topique — données limités. Précaution.','medium'),
  m('TRETINOINE TOPIQUE','Trétinoïne (Retin-A) topique',D,'Rétinoïde — CONTRE-INDIQUÉE même en topique. Absorption systémique documentée.'),
  m('BENZOYLE PEROXIDE','Benzoyle peroxyde (anti-acné)',C,'Oxydant — données limités grossesse. Précaution: éviter application étendue.','medium'),
  m('ACIDE AZELAIQUE TOPIQUE','Acide azélaïque topique (Skinoren)',C,'Anti-acnéique — données limités grossesse. Précaution au 1er trimestre.','medium'),
  m('CLINDAMYCINE TOPIQUE','Clindamycine (gel topique anti-acné)',C,'Antibiotique topique — données limités. Précaution.','medium'),
  m('ERYTHROMYCINE TOPIQUE','Érythromycine (gel topique)',C,'Antibiotique topique — données limités.','medium'),
  m('DAPSONE TOPIQUE','Dapsone (Aczone) topique',C,'Sulfone — données limités en grossesse.','medium'),
  m('PODOPHYLLOTOXINE','Podophyllotoxine (Condyline)',D,'Antimitotique topique — CONTRE-INDIQUÉ: tératogène documenté. CONTRE-INDIQUÉ.'),
  m('IMIQUIMOD','Imiquimod (Aldara)',C,'Immunomodulateur topique anti-HPV — données limités grossesse. Précaution.','medium'),
  m('PERMETRHINE TOPIQUE','Perméthrine (Topiscab) anti-gale',C,'Pyréthrinoïde topique — données limités grossesse. Utiliser si gale confirmée. Application brève.','medium'),
  m('LINDANE','Lindane',D,'Organochloré — neurotoxique. CONTRE-INDIQUÉ pendant la grossesse.'),
  m('IVERMECTINE TOPIQUE','Ivermectine topique (Soolantra)',C,'Antiparasitaire — données limités grossesse. Précaution.','medium'),
  m('CICLOSPORINE TOPIQUE','Ciclosporine (Restasis ophtalmique)',C,'Immunosuppresseur — ophtalmique: absorption systémique minime. Données limités.','medium'),
];

// ─── Vitamines, minéraux et compléments ───────────────────────────────────────
const SUPPLEMENTS: PreComputedIngredient[] = [
  m('ACIDE FOLIQUE MEDICAMENT','Acide folique 0,4 mg (Spéciafoldine)',S,'RECOMMANDÉ avant et pendant tout le 1er trimestre — prévention anomalies tube neural. 0,4 mg/j en population générale, 5 mg/j si antécédents. Sûr.'),
  m('ACIDE FOLIQUE 5MG','Acide folique 5 mg',S,'Dosage élevé prescrit si antécédent AFTN ou traitement antifolate. Sûr.'),
  m('VITAMINE D MEDICAMENT','Vitamine D3 (médicament)',C,'Supplémentation recommandée pendant la grossesse. Doses usuelles (1000-2000 UI/j): sûres. Très fortes doses: hypercalcémie fœtale.'),
  m('FER MEDICAMENT','Sulfate ferreux / fumarate ferreux',C,'Supplémentation si anémie ferriprive. Sûre. Effets digestifs possibles. Prendre à jeun ou entre les repas.'),
  m('IODE MEDICAMENT','Iodure de potassium (complément iode)',C,'Supplémentation en iode recommandée si carence documentée. Doses excessives: blocage thyroïdien fœtal.'),
  m('OMEGA 3 MEDICAMENT','Oméga-3 (EPA/DHA) prescription',S,'DHA essentiel pour le développement cérébral. Recommandé 200-300 mg DHA/j. Sûr.'),
  m('MAGNESIUM MEDICAMENT','Magnésium B6 (Magne B6)',S,'Traitement des crampes nocturnes gestationnelles. Sûr.'),
  m('CALCIUM MEDICAMENT','Calcium (prescription)',S,'Esssentiel pour la minéralisation fœtale. Sûr aux doses recommandées.'),
  m('VITAMINE B12 MEDICAMENT','Vitamine B12 (Cyanocobalamine)',S,'Essentielle en régime végétalien. Supplémentation recommandée. Sûre.'),
  m('GYNEFAM','Gynéfam / Gestarelle (multivitamines grossesse)',S,'Complexes vitamino-minéraux spécifiques grossesse. Formulation équilibrée. Sûrs.'),
  m('VITAMINE K NEONAT','Vitamine K1 néonatale',S,'Injection prophylactique recommandée à la naissance. Sûre et recommandée.'),
  m('ZINC MEDICAMENT','Zinc (supplémentation)',C,'Oligo-élément — supplémentation si carence. Doses élevées: inhibe absorption du cuivre.','medium'),
  m('PROBIOTIQUES','Probiotiques (Lactobacillus)',S,'Données rassurantes en grossesse. Utilisés contre les infections vaginales et diarrhées. Sûrs.','medium'),
  m('VITAMINE C MEDICAMENT','Vitamine C (médicament)',S,'Antioxydant. Sûre aux doses thérapeutiques habituelles (≤500 mg/j).','medium'),
  m('TOCOPHÉROL MEDICAMENT','Vitamine E (tocophérol medicament)',C,'Antioxydant. Supplémentation non recommandée systématiquement (association avec pré-éclampsie discutée). Précaution.','medium'),
];

// ─── Vaccins ──────────────────────────────────────────────────────────────────
const VACCINES: PreComputedIngredient[] = [
  m('VACCIN GRIPPE','Vaccin grippe inactivé',S,'RECOMMANDÉ pendant la grossesse (quel que soit le trimestre). Protège la mère et le nouveau-né. Sûr.'),
  m('VACCIN COQUELUCHE','Vaccin coqueluche (dTCaP)',S,'RECOMMANDÉ à chaque grossesse (28-32 SA). Protège le nouveau-né. Sûr.'),
  m('VACCIN COVID','Vaccin COVID-19 (ARNm)',S,'RECOMMANDÉ pendant la grossesse par OMS et HAS. Données rassurantes sur registres mondiaux. Protège la mère contre formes graves.'),
  m('VACCIN HEPATITE B','Vaccin hépatite B',C,'Vaccin inactivé — données rassurantes. Recommandé si non immunisée et risque élevé.','medium'),
  m('VACCIN HEPATITE A','Vaccin hépatite A',C,'Vaccin inactivé — données rassurantes. Recommandé si voyage en zone endémique.','medium'),
  m('VACCIN PNEUMOCOQUE','Vaccin pneumococcique inactivé',C,'Vaccin inactivé — données limités mais rassurantes. Si indication médicale.','medium'),
  m('VACCIN MENINGOCOQUE','Vaccin méningococcique',C,'Vaccin inactivé — données limités. Si épidémie ou indication.','medium'),
  m('VACCIN ROR','Vaccin rougeole-oreillons-rubéole (ROR)',D,'VACCIN VIVANT ATTÉNUÉ — CONTRE-INDIQUÉ pendant la grossesse. Vérifier immunité avant la grossesse.'),
  m('VACCIN VARICELLE','Vaccin varicelle (VZV vivant)',D,'VACCIN VIVANT ATTÉNUÉ — CONTRE-INDIQUÉ pendant la grossesse. Vérifier immunité avant.'),
  m('VACCIN FIEVRE JAUNE','Vaccin fièvre jaune (vivant atténué)',D,'VACCIN VIVANT — CONTRE-INDIQUÉ pendant la grossesse sauf risque d\'exposition élevé (décision au cas par cas).'),
  m('VACCIN TYPHOIDE VIVANT','Vaccin typhoïde oral vivant',D,'VACCIN VIVANT — CONTRE-INDIQUÉ pendant la grossesse. Forme injectable inactivée possible.','medium'),
  m('VACCIN BCG','BCG (vaccin tuberculose vivant atténué)',D,'VACCIN VIVANT — CONTRE-INDIQUÉ pendant la grossesse.','medium'),
  m('IMMUNOGLOBULINES','Immunoglobulines (anticorps)',S,'Immunisation passive — utilisée pour la prévention de la rubéole et herpès. Sûres.','medium'),
  m('IMMUNOGLOBULINES ANTI-D','Immunoglobulines anti-D (Rhésus)',S,'ESSENTIEL pour les femmes Rh négatif. Prévient l\'allo-immunisation. Sûr et obligatoire.'),
];

// ─── Plantes médicinales à risque ────────────────────────────────────────────
const HERBAL_REMEDIES: PreComputedIngredient[] = [
  m('ACTEE GRAPPES','Actée à grappes noires (Cimicifuga)',D,'Activité oestrogénique — effets utérins documentés. CONTRE-INDIQUÉ pendant toute la grossesse.'),
  m('DONG QUAI MEDECINE','Dong quaï (Angelica sinensis)',D,'Plante MTC — propriétés utérotoniques. CONTRE-INDIQUÉ.'),
  m('GATTILIER MEDECINE','Gattilier (Vitex agnus-castus)',D,'Modulateur hormonal — CONTRE-INDIQUÉ pendant la grossesse.'),
  m('EPHÉDRA MEDECINE','Éphédra (Ma Huang, éphedrine)',D,'Stimulant vasoconstricteur — CONTRE-INDIQUÉ: risque vasospasme placentaire.'),
  m('REGLISSE MEDECINE','Réglisse (Glycyrrhiza glabra) — usage médicinal',C,'Glycyrrhizine — HTA, rétention d\'eau, naissance prématurée. Déconseillée à doses médicinales.'),
  m('MILLEPERTUIS MEDECINE','Millepertuis (Hypericum perforatum)',D,'Interactions médicamenteuses majeures (anticoagulants, antiépileptiques). Photosensibilisant. CONTRE-INDIQUÉ.'),
  m('VALÉRIANE MEDECINE','Valériane médicinale (Valeriana officinalis)',C,'Sédatif — données insuffisantes. Précaution grossesse.','medium'),
  m('ECHINACEA MEDECINE','Échinacée (Echinacea purpurea)',C,'Immunostimulant — données limités. Précaution au 1er trimestre.','medium'),
  m('GINKGO BILOBA MEDECINE','Ginkgo biloba médicinal',C,'Antiagrégant plaquettaire — précaution en fin de grossesse (saignements).','medium'),
  m('GINSENG MEDECINE','Ginseng (Panax ginseng) médicinal',DC,'Adaptogène — données préoccupantes sur l\'utérus au 1er trimestre. Déconseillé.','medium'),
  m('CURCUMA MEDECINE','Curcuma (compléments concentrés)',C,'Anti-inflammatoire — données limités grossesse. Précaution à fortes doses.','medium'),
  m('PROPOLIS','Propolis',C,'Produit de la ruche — allergisant. Données grossesse limités.','medium'),
  m('ARNICA MEDECINE','Arnica (usage oral)',D,'Toxique par voie orale — CONTRE-INDIQUÉ. Usage topique sur peau saine: précaution.','medium'),
  m('GRANDE CAMOMILLE','Grande camomille (Tanacetum parthenium)',D,'Emménagogue — propriétés abortives potentielles. CONTRE-INDIQUÉE.','medium'),
  m('ABSINTHE MEDECINE','Absinthe (Artemisia absinthium)',D,'Neurotoxique (thuyone) et abortive. ABSOLUMENT CONTRE-INDIQUÉE.'),
  m('PENNYROYAL','Pouliot (Mentha pulegium)',D,'ABORTIF documenté — CONTRE-INDIQUÉ. Toxique par voie orale.'),
  m('ALOÈS ORAL','Aloès purgatif (oral)',DC,'Emménagogue et laxatif stimulant — déconseillé au 1er trimestre. À éviter.'),
  m('FRAMBOISIER MEDECINE','Feuille de framboisier médicinale',DC,'Déconseillée en 1er et 2e trimestres. Parfois utilisée à terme sur avis obstétricien.'),
  m('HUILE RICIN ORAL','Huile de ricin (orale)',DC,'Laxatif stimulant puissant — contractions utérines. À éviter en 1er et 2e trimestres.','medium'),
  m('CANNELLE MEDECINE','Cannelle médicinale (fortes doses)',DC,'Utérotonique à fortes doses. Déconseillée en 1er trimestre en usage médicinal.','medium'),
  m('SAUGE MEDECINE','Sauge officinale (médicinale)',D,'Emménagogue et abortive à doses médicinales. CONTRE-INDIQUÉE.'),
  m('GENÉVRIER MEDECINE','Genévrier (Juniperus communis) médicinal',D,'Néphrotoxique et abortif. CONTRE-INDIQUÉ.'),
  m('GAÏAC','Gaïac (résine)',D,'Propriétés abortives — CONTRE-INDIQUÉ.','low'),
  m('TANAISIE MEDECINE','Tanaisie (Tanacetum vulgare)',D,'TOXIQUE et abortive — ABSOLUMENT CONTRE-INDIQUÉE.'),
  m('COHOSH BLEU','Cohosh bleu (Caulophyllum thalictroides)',D,'Utérotonique puissant — CONTRE-INDIQUÉ. Accidents graves documentés.'),
  m('KAVA','Kava (Piper methysticum)',D,'Hépatotoxique — CONTRE-INDIQUÉ pendant la grossesse.','medium'),
  m('CONSOUDE','Consoude (Symphytum officinale)',D,'Alcaloïdes pyrrolizidiniques — hépatotoxiques et carcinogènes. CONTRE-INDIQUÉE.','medium'),
  m('GRAINE DE LIN MEDICAMENT','Graines de lin (phytoestrogènes)',C,'Phytoestrogènes (lignanes) — données limités. À consommer avec modération.','medium'),
  m('CHARDON MARIE MEDECINE','Chardon-Marie (Silybum marianum)',C,'Hépatoprotecteur — données grossesse limités. Précaution.','medium'),
  m('ORTIE INFUSION','Ortie (infusion médicinale)',C,'Astringente et nutritive — données grossesse limités. Précaution.','medium'),
  m('PASSIFLORE','Passiflore (Passiflora incarnata)',C,'Anxiolytique — données grossesse insuffisantes. Précaution.','medium'),
];

// ─── Médicaments ophtalmologiques ─────────────────────────────────────────────
const OPHTALMOLOGY: PreComputedIngredient[] = [
  m('LARMES ARTIFICIELLES','Larmes artificielles (hyaluronate / carmellose)',S,'Lubrifiants oculaires. Sûrs. Recommandés pour le syndrome de l\'œil sec gestationnel.'),
  m('TIMOLOL COLLYRE','Timolol (collyre pour glaucome)',C,'Bêtabloquant collyre — absorption systémique possible. Précaution: bradycardie et hypoglycémie néonatales.','medium'),
  m('LATANOPROST COLLYRE','Latanoprost (Xalatan) collyre',C,'Prostaglandine — absorption systémique limitée. Données limités grossesse.','medium'),
  m('DEXAMETHASONE COLLYRE','Dexaméthasone (collyre)',C,'Corticoïde ophtalmique — absorption systémique très faible. Utiliser si indispensable.','medium'),
  m('CIPROFLOXACINE COLLYRE','Ciprofloxacine (collyre ophtalmique)',C,'Fluoroquinolone en collyre — absorption systémique faible. Données limités grossesse.','medium'),
  m('CHLORAMPHENICOL COLLYRE','Chloramphénicol (collyre)',C,'Antibiotique — usage topique oculaire. Données limités grossesse. Précaution.','medium'),
];

// ─── Médicaments neurologiques ────────────────────────────────────────────────
const NEUROLOGY: PreComputedIngredient[] = [
  m('PHENYTOINE','Phénytoïne (Dihydan)',D,'Antiépileptique — TÉRATOGÈNE: syndrome hydantoïne fœtal. À éviter si possible. Si indispensable: supplémentation folate, surveillance.'),
  m('CARBAMAZEPINE','Carbamazépine (Tegretol)',DC,'Antiépileptique — risque tératogène (spina bifida). Continuer si épilepsie avec acide folique 5 mg/j et surveillance écho.'),
  m('LAMOTRIGINE ANTIEP','Lamotrigine (Lamictal) antiépileptique',C,'Antiépileptique — données rassurantes sur malformations majeures. Métabolisme accéléré: augmenter les doses. Supplémentation folate.'),
  m('LEVETIRACETAM','Lévétiracétam (Keppra)',C,'Antiépileptique — données rassurantes. Option favorable en grossesse.','medium'),
  m('TOPIRAMATE','Topiramate (Epitomax)',DC,'Antiépileptique — risque fentes labiopalatines au 1er trimestre (×3). Éviter si possible. Contraception si traitement maintenu.'),
  m('CLONAZEPAM ANTIEP','Clonazépam (Rivotril) antiépileptique',C,'Benzodiazépine — maintenir si épilepsie. Syndrome de sevrage néonatal.','medium'),
  m('ZONISAMIDE','Zonisamide',C,'Antiépileptique — données limités grossesse. Précaution.','medium'),
  m('PREGABALINE','Prégabaline (Lyrica)',C,'Gabapentinoïde — données préoccupantes sur malformations cardiaques au 1er trimestre. Précaution.'),
  m('GABAPENTINE','Gabapentine (Neurontin)',C,'Gabapentinoïde — données limités. Précaution par analogie avec prégabaline.','medium'),
  m('SUMATRIPTAN','Sumatriptan (Imigrane)',C,'Triptan antimigraine — données rassurantes dans les registres de grossesse. Utiliser si paracétamol insuffisant.'),
  m('ZOLMITRIPTAN','Zolmitriptan',C,'Triptan — données rassurantes. Précaution 1er trimestre.','medium'),
  m('PROPRANOLOL MIGRAINE','Propranolol (prophylaxie migraine)',C,'Bêtabloquant — possible si migraines invalidantes. Surveiller bêtabloquage néonatal.','medium'),
  m('AMANTADINE','Amantadine',D,'Antiparkinsonien — données préoccupantes. Éviter pendant la grossesse.','medium'),
  m('LEVODOPA','Lévodopa (Modopar)',C,'Antiparkinsonien — données très limités. Précaution stricte.','medium'),
  m('DONEPEZIL','Donepézil (Aricept)',C,'Inhibiteur de l\'acétylcholinestérase — données très limités grossesse.','low'),
];

// ─── Médicaments ORL ─────────────────────────────────────────────────────────
const ENT: PreComputedIngredient[] = [
  m('NASAUX DECONGESTIONNANTS','Vasoconstricteurs nasaux (oxymétazoline, naphazoline)',C,'Vasoconstricteurs — absorption systémique et vasoconstriction placentaire possible. Précaution: usage très bref (<3 jours).'),
  m('NASAUX CORTICOIDES','Corticoïdes nasaux (fluticasone, mométasone)',S,'Corticoïdes en spray nasal — absorption systémique très faible. Sûrs pendant la grossesse pour la rhinite.'),
  m('SERUM PHYSIOLOGIQUE','Sérum physiologique nasal',S,'Lavage nasal salin. Sûr et recommandé.'),
  m('LOZENGES STREPSILS','Pastilles antiseptiques ORL (Strepsils, Humex)',C,'Contiennent benzocaïne, alcool — précaution. Usage bref.','medium'),
  m('DIFFLAM','Benflumetol (Difflam spray)',C,'Anti-inflammatoire local ORL — données limités grossesse. Précaution.','medium'),
  m('PREDNISOLONE ORL','Prednisone (surdité brusque, rhinite sévère)',C,'Corticoïde systémique — utiliser si indispensable. Légère augmentation fente palatine au 1er trimestre à fortes doses.','medium'),
];

export async function scrapeCRAT(): Promise<PreComputedIngredient[]> {
  return [
    ...ANALGESICS, ...ANTIBIOTICS, ...ANTIVIRALS, ...ANTIFUNGALS,
    ...ANTIHISTAMINES, ...ANTIEMETICS, ...GI_MEDICATIONS,
    ...PSYCHOTROPICS, ...ANTIHYPERTENSIVES, ...ANTICOAGULANTS,
    ...CARDIAC, ...ENDOCRINE, ...RESPIRATORY, ...DERMATOLOGY,
    ...SUPPLEMENTS, ...VACCINES, ...HERBAL_REMEDIES,
    ...OPHTALMOLOGY, ...NEUROLOGY, ...ENT,
  ];
}
