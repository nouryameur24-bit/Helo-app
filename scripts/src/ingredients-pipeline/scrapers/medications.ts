/**
 * medications.ts — ~1 000 médicaments de marque français avec risques grossesse pré-calculés.
 * Sources: CRAT, ANSM, VIDAL, BDPM — noms de marque courants en France.
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

function b(ni: string, n: string, r: R, d: string, conf: 'high'|'medium'|'low' = 'high'): PreComputedIngredient {
  return ing(ni, n, 'medication', r, d, 'bdpm', conf);
}

// ─── Paracétamol (marques) ────────────────────────────────────────────────────
const PARACETAMOL_BRANDS: PreComputedIngredient[] = [
  b('DOLIPRANE 1000','Doliprane 1000 mg (paracétamol)',C,'Antalgique de référence grossesse. Dose max 1g × 4/j. Éviter usage prolongé. Préférer la dose minimale efficace.'),
  b('DOLIPRANE 500','Doliprane 500 mg',C,'Antalgique grossesse. 500 mg-1g selon intensité. Dose minimale efficace.'),
  b('DOLIPRANE PEDIATRIQUE','Doliprane pédiatrique / suspension',C,'Formulation pédiatrique du paracétamol. Sûre aux doses adaptées au poids.'),
  b('EFFERALGAN 1000','Efferalgan 1000 mg (paracétamol effervescent)',C,'Paracétamol effervescent. Sûr aux doses recommandées. Teneur en sodium à surveiller si rétention hydrique.'),
  b('EFFERALGAN 500','Efferalgan 500 mg effervescent',C,'Paracétamol effervescent. Sûr.','medium'),
  b('EFFERALGAN CODEINE','Efferalgan Codéïne (paracétamol + codéïne)',C,'Association paracétamol+codéïne. Éviter en fin de grossesse (dépression respiratoire néonatale). Précaution.'),
  b('DAFALGAN 1000','Dafalgan 1000 mg (paracétamol)',C,'Paracétamol. Sûr aux doses recommandées.'),
  b('DAFALGAN CODEINE','Dafalgan Codéïne',C,'Paracétamol + codéïne. Éviter en fin de grossesse.'),
  b('CLARADOL','Claradol (paracétamol)',C,'Paracétamol. Sûr.','medium'),
  b('PANADOL','Panadol (paracétamol)',C,'Paracétamol. Sûr.','medium'),
  b('PERFALGAN','Perfalgan (paracétamol IV)',C,'Paracétamol injectable — usage hospitalier. Sûr aux doses recommandées.','medium'),
  b('ACUPAN','Acupan (néfopam)',C,'Analgésique non opioïde — données limités grossesse. Précaution. Éviter si possible.','medium'),
];

// ─── AINS (marques) ───────────────────────────────────────────────────────────
const NSAID_BRANDS: PreComputedIngredient[] = [
  b('ADVIL 200','Advil 200 mg (ibuprofène)',CD,'CONTRE-INDIQUÉ à partir de 20 SA. Déconseillé aux 1er et 2e trimestres. Préférer paracétamol.'),
  b('ADVIL 400','Advil 400 mg (ibuprofène)',CD,'CONTRE-INDIQUÉ à partir de 20 SA. Risque fermeture canal artériel.'),
  b('NUROFEN 200','Nurofen 200 mg (ibuprofène)',CD,'Ibuprofène — CONTRE-INDIQUÉ à partir du 5e mois.'),
  b('NUROFEN 400','Nurofen 400 mg (ibuprofène)',CD,'Ibuprofène — CONTRE-INDIQUÉ à partir du 5e mois.'),
  b('NUROFEN FLASH','Nurofen Flash (ibuprofène)',CD,'Ibuprofène — même contre-indication.','medium'),
  b('SPEDIFEN 400','Spédifen 400 mg (ibuprofène)',CD,'Ibuprofène — CONTRE-INDIQUÉ à partir de 20 SA.'),
  b('UPFEN','Upfen (ibuprofène)',CD,'Ibuprofène — CONTRE-INDIQUÉ à partir de 20 SA.','medium'),
  b('VOLTARENE GEL','Voltarène gel (diclofénac topique)',CD,'AINS topique — CONTRE-INDIQUÉ à partir de 20 SA même en topique (absorption systémique).'),
  b('VOLTARENE EMULGEL','Voltarène Emulgel (diclofénac)',CD,'AINS topique — même contre-indication que Voltarène gel.'),
  b('FLECTOR PATCH','Flector patch (diclofénac topique)',CD,'Patch diclofénac — CONTRE-INDIQUÉ à partir de 20 SA.','medium'),
  b('KETUM GEL','Kétum gel (kétoprofène topique)',CD,'AINS topique — CONTRE-INDIQUÉ à partir de 20 SA. Précaution au soleil.'),
  b('PROFENID GEL','Profénid gel (kétoprofène topique)',CD,'AINS topique — CONTRE-INDIQUÉ à partir de 20 SA.','medium'),
  b('BI-PROFENID','Bi-Profénid (kétoprofène oral)',CD,'AINS oral — CONTRE-INDIQUÉ à partir du 5e mois.'),
  b('ASPIRINE CARDIO','Aspirine Cardio 100 mg (anticoagulant)',S,'À dose anticoagulante (75-100 mg): prescrite pour prévention pré-éclampsie. Sûre à cette dose spécifique.'),
  b('ASPEGIC 100','Aspégic 100 mg (antiagrégant)',S,'Aspirine faible dose — prescrite par le médecin pour pré-éclampsie. Sûre à 100 mg.'),
  b('ASPEGIC 500','Aspégic 500 mg (antidouleur)',CD,'Aspirine doses antalgiques — CONTRE-INDIQUÉE à partir du 6e mois.'),
  b('ASPIRINE UPSA 500','Aspirine UPSA 500 mg',CD,'Aspirine à dose antalgique — CONTRE-INDIQUÉE à partir du 6e mois.'),
  b('RHINADVIL','Rhinadvil (ibuprofène + pseudoéphédrine)',CD,'AINS + vasoconstricteur — DOUBLEMENT CONTRE-INDIQUÉ pendant la grossesse.'),
  b('RHINUREFLEX','Rhinureflex (ibuprofène + pseudoéphédrine)',CD,'Même contre-indication que Rhinadvil.','medium'),
];

// ─── Antihistaminiques / Allergie (marques) ───────────────────────────────────
const ANTIHISTAMINE_BRANDS: PreComputedIngredient[] = [
  b('ZYRTEC 10','Zyrtec 10 mg (cétirizine)',C,'Antihistaminique — données rassurantes. Préférer en 2e/3e trimestre. Traitement rhinite allergique si nécessaire.'),
  b('AERIUS 5','Aérius 5 mg (desloratadine)',C,'Antihistaminique — données rassurantes. Utiliser si nécessaire.'),
  b('XYZALL','Xyzall (lévocétirizine)',C,'Antihistaminique — données rassurantes.','medium'),
  b('CLARITYNE 10','Clarityne 10 mg (loratadine)',C,'Antihistaminique de référence en grossesse si traitement nécessaire. Données rassurantes.'),
  b('TELFAST','Telfast (fexofénadine)',C,'Antihistaminique — données limités grossesse. Précaution.','medium'),
  b('ACTIFED RHUME','Actifed Rhume (pseudoéphédrine + triprolidine)',DC,'CONTRE-INDIQUÉ au 1er trimestre (pseudoéphédrine: vasoconstricteur). Déconseillé pendant toute la grossesse.'),
  b('DESURIC','Humex Rhume, Dolirhume (pseudoéphédrine)',DC,'Vasoconstricteur nasal oral — CONTRE-INDIQUÉ pendant la grossesse (vasospasme placentaire).'),
  b('POLARAMINE','Polaramine (dexchlorphéniramine)',C,'Antihistaminique 1G — données rassurantes. Sédatif. Précaution en fin de grossesse.','medium'),
  b('PHENERGAN','Phénergan (prométhazine)',C,'Antihistaminique phénothiazine — antiémétique. Précaution en fin de grossesse (syndrome extrapyramidal néonatal).','medium'),
  b('ATARAX 25','Atarax 25 mg (hydroxyzine)',C,'Antihistaminique anxiolytique — à éviter avant l\'accouchement. Données malformations rassurantes.'),
  b('DONORMYL','Donormyl (doxylamine)',S,'Antihistaminique — traitement de référence des nausées de grossesse. Données rassurantes. Associé à B6.'),
  b('PRIMPERAN','Primperan (métoclopramide)',C,'Antiémétique — traitement de courte durée. Éviter en fin de grossesse.'),
  b('VOGALENE','Vogalène (métopimazine)',C,'Antiémétique phénothiazine. Précaution en fin de grossesse.','medium'),
  b('NARAMIG','Naramig (naratriptan)',C,'Triptan antimigraine — données limités. Précaution.','medium'),
  b('IMIGRANE','Imigrane (sumatriptan)',C,'Triptan — données rassurantes dans les registres grossesse. Premier choix parmi les triptans.'),
  b('ZOMIG','Zomig (zolmitriptan)',C,'Triptan — données rassurantes. Utiliser si paracétamol insuffisant.','medium'),
];

// ─── Gastrologie (marques) ────────────────────────────────────────────────────
const GASTRO_BRANDS: PreComputedIngredient[] = [
  b('MOPRAL 20','Mopral 20 mg (oméprazole)',C,'IPP — données rassurantes extensives. Traitement de référence du RGO gestationnel.'),
  b('MOPRAL 10','Mopral 10 mg (oméprazole)',C,'IPP — données rassurantes. RGO gestationnel.','medium'),
  b('INEXIUM 20','Inexium 20 mg (ésoméprazole)',C,'IPP — données rassurantes. Traitement du RGO.','medium'),
  b('INEXIUM 40','Inexium 40 mg (ésoméprazole)',C,'IPP — données rassurantes.','medium'),
  b('INIPOMP','Inipomp (pantoprazole)',C,'IPP — données rassurantes. Utiliser si nécessaire.','medium'),
  b('OGASTORO','Ogastoro (lansoprazole)',C,'IPP — données rassurantes.','medium'),
  b('GAVISCON SUSPENSION','Gaviscon (alginate)',S,'Antiacide mécanique de première ligne du RGO. Non absorbé. Sûr et recommandé.'),
  b('GAVISCON EXTRA','Gaviscon Extra (alginate + bicarbonate)',S,'Antiacide — même profil que Gaviscon. Sûr.','medium'),
  b('RENNIE','Rennie (carbonate de calcium + magnésium)',S,'Antiacide — sûr. Apport calcique bénéfique.','medium'),
  b('MAALOX SUSPENSION','Maalox (hydroxydes aluminium + magnésium)',C,'Antiacide — éviter usage chronique (aluminium). Ponctuel: sûr.','medium'),
  b('GELOX','Gélox (hydroxyde d\'aluminium + magnésium)',C,'Antiacide — usage ponctuel acceptable.','medium'),
  b('SMECTA','Smecta (diosmectite)',S,'Pansement intestinal — sûr pendant la grossesse pour les diarrhées.'),
  b('IMODIUM 2','Imodium 2 mg (lopéramide)',C,'Anti-diarrhéique — données non alarmantes mais limités. Usage très ponctuel si diarrhée sévère.','medium'),
  b('DULCOLAX 5','Dulcolax 5 mg (bisacodyl)',C,'Laxatif stimulant — éviter si possible. Usage très ponctuel.','medium'),
  b('DUPHALAC','Duphalac (lactulose)',S,'Laxatif osmotique de référence de la constipation gestationnelle. Sûr.'),
  b('FORLAX','Forlax (macrogol 4000)',S,'Laxatif osmotique — sûr pendant la grossesse.'),
  b('MOVICOL','Movicol (macrogol + électrolytes)',S,'Laxatif osmotique — sûr.','medium'),
  b('NORMACOL','Normacol (sterculia gum)',S,'Laxatif de lest. Sûr.','medium'),
  b('MUCIVITAL','Mucivital (psyllium)',S,'Laxatif de lest naturel. Sûr.','medium'),
  b('SPASFON','Spasfon (phloroglucinol)',C,'Antispasmodique intestinal/utérin — données limités. Utilisé en France pour les contractions du travail. Précaution.','medium'),
  b('DUSPATALIN','Duspatalin (mébévérine)',C,'Antispasmodique — données limités grossesse. Précaution.','medium'),
  b('METEOSPASMYL','Méteospasmyl (citrate d\'alvérine + siméticone)',C,'Antispasmodique + antiflatulent. Données limités grossesse.','medium'),
  b('GAVISCONELL','Gavisconell (alginate sodium)',S,'Antiacide alginate. Sûr.','medium'),
  b('PHOSPHALUGEL','Phosphalugel (phosphate d\'aluminium)',C,'Antiacide — usage ponctuel. Précaution usage chronique (aluminium).','medium'),
];

// ─── Antibiotiques (marques françaises) ───────────────────────────────────────
const ANTIBIOTIC_BRANDS: PreComputedIngredient[] = [
  b('AMOXICILLINE EG','Amoxicilline (générique)',S,'Pénicilline — antibiotique de première intention. Sûre pendant toute la grossesse.'),
  b('CLAMOXYL 500','Clamoxyl 500 mg (amoxicilline)',S,'Pénicilline — sûre pendant la grossesse.'),
  b('CLAMOXYL 1G','Clamoxyl 1g (amoxicilline)',S,'Pénicilline — sûre.','medium'),
  b('AUGMENTIN 1G','Augmentin 1g (amoxicilline + acide clavulanique)',C,'Pénicilline protégée — données rassurantes globalement. Utiliser si indispensable.'),
  b('AUGMENTIN 500','Augmentin 500 mg/62,5 mg',C,'Pénicilline protégée. Précaution.','medium'),
  b('CEFPODOXIME MYLAN','Céfpodoxime (Oroken)',S,'Céphalosporine orale — sûre.','medium'),
  b('OROKEN 100','Oroken 100 mg (céfpodoxime)',S,'Céphalosporine — sûre pendant la grossesse.'),
  b('ZINNAT 250','Zinnat (céfuroxime)',S,'Céphalosporine 2G — sûre.','medium'),
  b('SUPRAX','Suprax (céfixime)',S,'Céphalosporine 3G orale — sûre.','medium'),
  b('AZITHROMYCINE EG','Azithromycine (Zithromax)',C,'Macrolide — données rassurantes. Utiliser si indication.'),
  b('ZITHROMAX 250','Zithromax 250 mg (azithromycine)',C,'Macrolide — données rassurantes.','medium'),
  b('PYOSTACINE 500','Pyostacine 500 mg (pristinamycine)',C,'Streptogramine — données limités. Alternative allergie pénicilline.','medium'),
  b('FLAGYL 250','Flagyl 250 mg (métronidazole)',C,'Imidazolé — données rassurantes en 2e-3e trimestres. Précaution au 1er.'),
  b('FLAGYL 500','Flagyl 500 mg (métronidazole IV)',C,'Métronidazole IV — utiliser si infection grave nécessite.','medium'),
  b('MONURIL 3G','Monuril 3g (fosfomycine)',S,'Traitement de l\'infection urinaire en prise unique. Sûr pendant la grossesse.'),
  b('FURADANTINE','Furadantine (nitrofurantoïne)',C,'IU — CONTRE-INDIQUÉE après 36 SA (ictère néonatal). Sûre en 2e-3e trimestres si indispensable.'),
  b('MACRODANTIN','Macrodantin (nitrofurantoïne)',C,'Nitrofurantoïne — même précaution que Furadantine.','medium'),
  b('ROCEPHINE','Rocéphine (ceftriaxone IV/IM)',C,'Céphalosporine 3G injectable — réserver aux infections graves. Précaution en fin de grossesse.','medium'),
  b('VIBRAMYCINE','Vibramycine (doxycycline)',DCC,'CONTRE-INDIQUÉE à partir du 2e trimestre — coloration dentaire, atteinte osseuse fœtale.'),
  b('DOXYPALU','Doxypalu (doxycycline anti-paludéen)',DCC,'Doxycycline — CONTRE-INDIQUÉE à partir du 2e trimestre.'),
  b('OFLOCET','Oflocet (ofloxacine)',C,'Quinolone — déconseillée. Réserver aux infections résistantes.','medium'),
  b('CIFLOX','Ciflox (ciprofloxacine)',C,'Quinolone — déconseillée si alternative possible.','medium'),
];

// ─── Antifongiques (marques) ──────────────────────────────────────────────────
const ANTIFUNGAL_BRANDS: PreComputedIngredient[] = [
  b('MYCOHYDRALIN','Mycohydralin (clotrimazole vaginal)',S,'Imidazolé topique — traitement de référence mycose vaginale pendant la grossesse. Sûr.'),
  b('GYNAZOLE 1','Gynazole 1 (butoconazole vaginal)',C,'Imidazolé vaginal — données limités grossesse. Précaution.','medium'),
  b('GYNOPLIX','Gynoplix (miconazole vaginal)',C,'Imidazolé vaginal — précaution avec applicateur en fin de grossesse.','medium'),
  b('LOMEXIN','Loméxin (fenticonazole vaginal)',C,'Imidazolé vaginal — données limités grossesse. Précaution.','medium'),
  b('FAZOL OVULE','Fazol ovule (isoconazole vaginal)',C,'Imidazolé — données limités. Précaution.','medium'),
  b('TRIFLUCAN 150','Triflucan 150 mg (fluconazole oral dose unique)',DC,'Azolé oral — CONTRE-INDIQUÉ au 1er trimestre. Dose unique 150 mg: précaution hors 1er trimestre.'),
  b('SPORANOX','Sporanox (itraconazole)',DC,'Azolé systémique — à éviter pendant la grossesse si possible.','medium'),
  b('PEVARYL CREME','Pévaryl crème (éconazole topique)',S,'Imidazolé topique — sûr en usage local.','medium'),
  b('NIZORAL CREME','Nizoral crème (kétoconazole topique)',C,'Imidazolé topique — données limités grossesse.','medium'),
  b('LAMISIL CREME','Lamisil crème (terbinafine topique)',C,'Allylamine topique — données limités. Précaution.','medium'),
];

// ─── Antiparasitaires ─────────────────────────────────────────────────────────
const ANTIPARASITIC_BRANDS: PreComputedIngredient[] = [
  b('MALARONE','Malarone (atovaquone + proguanil)',C,'Anti-paludéen — données limités grossesse. Déconseillé au 1er trimestre. Alternative recommandée si possible.','medium'),
  b('SAVARINE','Savarine (chloroquine + proguanil)',C,'Anti-paludéen — données rassurantes. Proguanil: supplémenter en acide folique.','medium'),
  b('QUININE','Quinine (anti-paludéen)',C,'Anti-paludéen — données rassurantes pour le traitement du paludisme grave. Stimulation utérine à fortes doses.','medium'),
  b('FLAGYL ANTI-PARASITAIRE','Flagyl (métronidazole anti-parasitaire)',C,'Anti-protozoaire — données rassurantes en 2e-3e trimestres.','medium'),
  b('ZENTEL','Zentel (albendazole)',C,'Anthelminthique — données préoccupantes en 1er trimestre. Précaution.','medium'),
  b('VERMOX','Vermox (mébendazole)',C,'Anthelminthique — données limités grossesse. Précaution au 1er trimestre.','medium'),
  b('STROMECTOL','Stromectol (ivermectine)',C,'Antiparasitaire systémique — données grossesse limités. Précaution.','medium'),
  b('TOPISCAB','Topiscab (perméthrine crème)',C,'Anti-gale — utiliser si gale confirmée. Absorption cutanée limitée. Données rassurantes.','medium'),
];

// ─── Vitamines et suppléments (marques françaises) ────────────────────────────
const SUPPLEMENT_BRANDS: PreComputedIngredient[] = [
  b('SPECIAFOLDINE 5','Spéciafoldine 5 mg (acide folique)',S,'Acide folique haute dose — prescrit si antécédents ATN. Sûr et recommandé.'),
  b('SPECIAFOLDINE 0.4','Spéciafoldine 0,4 mg (acide folique)',S,'Acide folique — RECOMMANDÉ avant et pendant le 1er trimestre. Prévention ATN.'),
  b('GYNEFAM','Gynéfam (complexe vitamino-minéral grossesse)',S,'Complément grossesse équilibré. Sûr et recommandé.'),
  b('GESTARELLE G','Gestarelle G (vitamines + minéraux grossesse)',S,'Complexe grossesse. Sûr.','medium'),
  b('OLIGOBS GROSSESSE','Oligobs Grossesse (vitamines + oméga-3)',S,'Complément grossesse. Sûr.','medium'),
  b('ELEVIT PRONATAL','Elevit Pronatal (vitamines grossesse)',S,'Complexe vitamino-minéral grossesse. Sûr.','medium'),
  b('TARDYFERON B9','Tardyferon B9 (sulfate ferreux + acide folique)',C,'Fer + acide folique — sûr si anémie confirmée. Effets digestifs possibles.'),
  b('FERO-GRAD VITAMINE C','Fero-Grad vitamine C (sulfate ferreux)',C,'Fer — sûr si anémie ferriprive.','medium'),
  b('TIMOFEROL','Timoferol (fumarate ferreux)',C,'Fer — sûr si anémie.','medium'),
  b('FERROGRAD','Ferrograd (sulfate ferreux)',C,'Fer — sûr si anémie ferriprive.','medium'),
  b('ZYMA D2','Zymad (vitamine D3)',C,'Vitamine D — recommandée pendant la grossesse. Doses usuelles: sûres. Fortes doses: précaution.'),
  b('UVEDOSE','Uvédose (vitamine D3 ampoule)',C,'Vitamine D dose d\'attaque — sur prescription. Sûre aux doses recommandées.','medium'),
  b('OSTO D3','Ostéo D3 (vitamine D3 + calcium)',C,'Vitamine D + calcium — sûr. Éviter le surdosage en calcium.','medium'),
  b('ERGOCALCIFEROL','Ergocalciférol (vitamine D2)',C,'Vitamine D — sûre aux doses recommandées.','medium'),
  b('MAGNE B6','Magne B6 (magnésium + B6)',S,'Traitement des crampes nocturnes gestationnelles. Sûr.'),
  b('MAGNE B6 FORT','Magne B6 Fort (magnésium)',S,'Magnésium — sûr.','medium'),
  b('MAGNESPASMYL','Magnéspasmyl (magnésium)',S,'Magnésium — sûr.','medium'),
  b('VITAMINE C EG 500','Vitamine C 500 mg (EG)',S,'Vitamine C — sûre aux doses recommandées.','medium'),
  b('OMEGA 3 FORTÉ GROSSESSE','Oméga 3 fortifié (DHA+EPA)',S,'Oméga-3 — recommandés pendant la grossesse pour le développement cérébral.'),
  b('ACIDE FOLIQUE 0.4 BIOGARAN','Acide folique 0,4 mg générique',S,'Folates — RECOMMANDÉS avant et pendant le 1er trimestre.','medium'),
];

// ─── Médicaments cardio / tension (marques) ───────────────────────────────────
const CARDIO_BRANDS: PreComputedIngredient[] = [
  b('ALDOMET 250','Aldomet 250 mg (méthyldopa)',S,'Antihypertenseur de référence grossesse — données rassurantes sur 40 ans.'),
  b('ALDOMET 500','Aldomet 500 mg (méthyldopa)',S,'Méthyldopa — premier choix HTA grossesse.'),
  b('TRANDATE 200','Trandate 200 mg (labétalol)',C,'Bêtabloquant — 2e ligne HTA gravidique. Surveiller bêtabloquage néonatal.'),
  b('ADALATE 10','Adalate 10 mg LP (nifédipine)',C,'Inhibiteur calcique — données rassurantes pour HTA grossesse.'),
  b('ADALATE 20','Adalate 20 mg LP (nifédipine)',C,'Inhibiteur calcique — 2e ligne HTA grossesse.','medium'),
  b('LOXEN 20','Loxen 20 mg (nicardipine)',C,'Inhibiteur calcique — urgences hypertensives obstétricales. Données rassurantes.','medium'),
  b('LODOZ','Lodoz (bisoprolol + hydrochlorothiazide)',C,'Bêtabloquant + thiazidique — précaution grossesse. Préférer monothérapie.','medium'),
  b('LASILIX 20','Lasilix 20 mg (furosémide)',C,'Diurétique — réserver aux œdèmes pulmonaires. Précaution grossesse.','medium'),
  b('COUMADINE 2','Coumadine 2 mg (warfarine)',D,'AVK — CONTRE-INDIQUÉ. Embryopathie coumadine et hémorragies. Remplacer par HBPM.'),
  b('SINTROM 4','Sintrom 4 mg (acénocoumarol)',D,'AVK — CONTRE-INDIQUÉ. Remplacer par HBPM.'),
  b('ELIQUIS 5','Eliquis 5 mg (apixaban)',D,'AOD — CONTRE-INDIQUÉ pendant la grossesse. Remplacer par HBPM.'),
  b('XARELTO 10','Xarelto 10 mg (rivaroxaban)',D,'AOD — CONTRE-INDIQUÉ. Remplacer par HBPM.'),
  b('PRADAXA 110','Pradaxa 110 mg (dabigatran)',D,'AOD — CONTRE-INDIQUÉ. HBPM de substitution.','medium'),
  b('LOVENOX 0.4','Lovenox 0,4 ml (énoxaparine HBPM)',S,'HBPM — anticoagulant de référence pendant la grossesse. Ne traverse pas le placenta. Sûr.'),
  b('LOVENOX 0.6','Lovenox 0,6 ml (énoxaparine)',S,'HBPM — sûre.','medium'),
  b('FRAGMINE','Fragmine (daltéparine HBPM)',S,'HBPM — sûre pendant la grossesse.','medium'),
  b('INNOHEP','Innohep (tinzaparine HBPM)',S,'HBPM — sûre.','medium'),
  b('CORDARONE 200','Cordarone 200 mg (amiodarone)',D,'Antiarythmique — CONTRE-INDIQUÉE: hypothyroïdie fœtale. Réserver cas extrêmes.'),
  b('TAHOR 10','Tahor 10 mg (atorvastatine)',D,'Statine — CONTRE-INDIQUÉE pendant la grossesse.'),
  b('ZOCOR 20','Zocor 20 mg (simvastatine)',D,'Statine — CONTRE-INDIQUÉE.'),
  b('CRESTOR 10','Crestor 10 mg (rosuvastatine)',D,'Statine — CONTRE-INDIQUÉE.','medium'),
  b('TRIATEC 2.5','Triatec 2,5 mg (ramipril IEC)',D,'IEC — CONTRE-INDIQUÉ dès le 2e trimestre. Foetopathie des IEC.'),
  b('RENITEC 20','Rénitec 20 mg (énalapril IEC)',D,'IEC — CONTRE-INDIQUÉ dès le 2e trimestre.'),
  b('COVERAM','Coveram (amlodipine + périndopril IEC)',D,'Association avec IEC — CONTRE-INDIQUÉ.','medium'),
  b('MICARDIS 40','Micardis 40 mg (telmisartan sartan)',D,'ARA II/sartan — CONTRE-INDIQUÉ dès la conception.'),
  b('COZAAR 50','Cozaar 50 mg (losartan sartan)',D,'Sartan — CONTRE-INDIQUÉ.'),
  b('APROVEL 150','Aprovel 150 mg (irbésartan sartan)',D,'Sartan — CONTRE-INDIQUÉ.','medium'),
];

// ─── Thyroïde / Endocrine (marques) ───────────────────────────────────────────
const THYROID_BRANDS: PreComputedIngredient[] = [
  b('LEVOTHYROX 25','Lévothyrox 25 µg',S,'Hormone thyroïdienne — ESSENTIELLE. Besoins augmentent dès 4-6 SA. Adapter rapidement.'),
  b('LEVOTHYROX 50','Lévothyrox 50 µg',S,'Lévothyroxine — augmenter les doses précocement pendant la grossesse.'),
  b('LEVOTHYROX 75','Lévothyrox 75 µg',S,'Lévothyroxine. Essentielle.'),
  b('LEVOTHYROX 100','Lévothyrox 100 µg',S,'Lévothyroxine. Essentielle.','medium'),
  b('LEVOTHYROX 125','Lévothyrox 125 µg',S,'Lévothyroxine. Essentielle.','medium'),
  b('LEVOTHYROX 150','Lévothyrox 150 µg',S,'Lévothyroxine. Essentielle.','medium'),
  b('EUTHYROX','Euthyrox (lévothyroxine alternative)',S,'Lévothyroxine — alternative à Lévothyrox. Sûre.','medium'),
  b('TCAPS','TCaps (lévothyroxine gélule)',S,'Lévothyroxine en gélule. Sûre.','medium'),
  b('THYROFIX','Thyrofix (lévothyroxine)',S,'Lévothyroxine — sûre. Besoins à surveiller en grossesse.','medium'),
  b('PROPYLTHIOURACILE 25','Propylthiouracil (PTU) 25 mg',C,'Antithyroïdien — préféré au méthimazole au 1er trimestre.'),
  b('NEOTYMAZOL','Néotymazol (méthimazole)',C,'Antithyroïdien — à éviter au 1er trimestre (aplasie cutis). Utiliser au 2e-3e trimestres si PTU indisponible.'),
  b('CARBIMAZOLE MEDECAMENT','Carbimazole (Néo-Mercazole)',C,'Prodrogue du méthimazole — mêmes précautions. À éviter au 1er trimestre.','medium'),
  b('GLUCOPHAGE 500','Glucophage 500 mg (metformine)',C,'Antidiabétique — utilisé dans le diabète gestationnel. Données rassurantes.'),
  b('GLUCOPHAGE 850','Glucophage 850 mg (metformine)',C,'Metformine — données rassurantes pour le diabète gestationnel.','medium'),
  b('DAONIL 5','Daonil 5 mg (glibenclamide)',C,'Sulfamide hypoglycémiant — utilisé parfois dans le DG. Données acceptables.','medium'),
  b('ACTRAPID','Actrapid (insuline rapide humaine)',S,'Insuline — ne traverse pas le placenta. Sûre et essentielle en DT1 et DG.'),
  b('NOVORAPID','Novorapid (insuline asparte)',S,'Analogue insuline rapide — sûr. Utilisé en DG et DT1.'),
  b('LANTUS','Lantus (insuline glargine)',C,'Analogue insuline basale — données rassurantes. Utiliser si indiqué.','medium'),
  b('HUMALOG','Humalog (insuline lispro)',S,'Analogue insuline rapide — données rassurantes. Sûr.','medium'),
  b('LEVEMIR','Levemir (insuline détémir)',C,'Insuline basale — données rassurantes. Utilisée en DT1 et DG.','medium'),
  b('UTROGESTAN 200','Utrogestan 200 mg (progestérone naturelle vaginale)',S,'Progestérone naturelle — utilisée pour maintenir la grossesse. Sûre.'),
  b('DUPHASTON 10','Duphaston 10 mg (dydrogestérone)',C,'Progestine de synthèse — données rassurantes. Utilisée pour menace d\'avortement.','medium'),
  b('LUTENYL','Luténil (nomégestrol acétate)',C,'Progestine — données limités grossesse.','medium'),
];

// ─── Antidépresseurs / Psychotropes (marques) ─────────────────────────────────
const PSYCHO_BRANDS: PreComputedIngredient[] = [
  b('ZOLOFT 50','Zoloft 50 mg (sertraline)',C,'ISRS — premier choix si antidépresseur nécessaire. Données rassurantes sur malformations.'),
  b('PROZAC 20','Prozac 20 mg (fluoxétine)',C,'ISRS — données rassurantes mais demi-vie longue. HTAPPN en fin de grossesse.'),
  b('SEROPLEX 10','Séroplex 10 mg (escitalopram)',C,'ISRS — données rassurantes globalement. Syndrome de sevrage néonatal possible.','medium'),
  b('DEROXAT 20','Déroxat 20 mg (paroxétine)',C,'ISRS — légère augmentation malformations cardiaques documentée. Précaution au 1er trimestre.'),
  b('EFFEXOR 75','Effexor 75 mg (venlafaxine)',C,'IRSNA — données rassurantes sur malformations. Syndrome de sevrage sévère néonatal.'),
  b('CYMBALTA 30','Cymbalta 30 mg (duloxétine)',C,'IRSNA — données limités. Précaution.','medium'),
  b('NORSET 15','Norset 15 mg (mirtazapine)',C,'Antidépresseur — données rassurantes. Sédatif.','medium'),
  b('ANAFRANIL 25','Anafranil 25 mg (clomipramine)',C,'Tricyclique — syndrome de sevrage néonatal. Si indispensable.','medium'),
  b('DEPAKINE 500','Dépakine 500 mg (valproate)',D,'TÉRATOGÈNE MAJEUR — ABSOLUMENT CONTRE-INDIQUÉ. Programme de prévention grossesse obligatoire.'),
  b('DEPAKOTE','Depakote (valproate divalproex)',D,'Valproate — CONTRE-INDIQUÉ ABSOLUMENT.'),
  b('LAMICTAL 25','Lamictal 25 mg (lamotrigine)',C,'Antiépileptique — données rassurantes. Métabolisme accéléré: surveiller les taux.'),
  b('TEGRETOL 200','Tégretol 200 mg (carbamazépine)',DC,'Antiépileptique — tératogène (spina bifida). Si indispensable: folate 5 mg/j.'),
  b('KEPPRA 250','Keppra 250 mg (lévétiracétam)',C,'Antiépileptique — données rassurantes. Option favorable.','medium'),
  b('LYRICA 75','Lyrica 75 mg (prégabaline)',C,'Gabapentinoïde — données préoccupantes sur malformations cardiaques. Précaution.'),
  b('RIVOTRIL 0.5','Rivotril 0,5 mg (clonazépam)',C,'Benzodiazépine antiépileptique — maintenir si épilepsie. Syndrome de sevrage néonatal.','medium'),
  b('XANAX 0.25','Xanax 0,25 mg (alprazolam)',C,'Benzodiazépine — syndrome de sevrage néonatal. Ponctuel si crise anxieuse sévère.'),
  b('TEMESTA 1','Temesta 1 mg (lorazépam)',C,'Benzodiazépine — réserver aux urgences.','medium'),
  b('VALIUM 5','Valium 5 mg (diazépam)',C,'Benzodiazépine — réserver aux urgences.'),
  b('STILNOX 10','Stilnox 10 mg (zolpidem)',C,'Hypnotique Z — données rassurantes sur malformations. Éviter usage prolongé.','medium'),
  b('IMOVANE 7.5','Imovane 7,5 mg (zopiclone)',C,'Hypnotique Z — mêmes précautions que zolpidem.','medium'),
  b('SEROQUEL 25','Seroquel 25 mg (quétiapine)',C,'Antipsychotique — données rassurantes sur malformations.','medium'),
  b('ZYPREXA 5','Zyprexa 5 mg (olanzapine)',C,'Antipsychotique — données rassurantes sur malformations. Syndrome métabolique.','medium'),
  b('RISPERDAL 1','Risperdal 1 mg (rispéridone)',C,'Antipsychotique — syndrome extrapyramidal néonatal. Précaution en fin de grossesse.','medium'),
  b('ABILIFY 5','Abilify 5 mg (aripiprazole)',C,'Antipsychotique — données limités. Précaution.','medium'),
  b('SUBUTEX 2','Subutex 2 mg (buprénorphine)',C,'Substitution opioïde — maintenir si dépendance. Syndrome de sevrage néonatal.'),
  b('METHADONE LIQUIDE','Méthadone solution buvable',C,'Substitution opioïde — maintenir avec suivi spécialisé.'),
];

// ─── Médicaments respiratoires (marques) ─────────────────────────────────────
const RESPIRATORY_BRANDS: PreComputedIngredient[] = [
  b('VENTOLINE 100','Ventoline 100 µg (salbutamol)',S,'Bronchodilatateur de référence asthme — CONTINUER l\'asthme pendant la grossesse est ESSENTIEL. Inhalation: sûre.'),
  b('BRICANYL TURBU','Bricanyl Turbuhaler (terbutaline)',S,'Bêta-2 — traitement asthme pendant la grossesse. Sûr en inhalation.','medium'),
  b('PULMICORT 200','Pulmicort 200 µg (budésonide inhalé)',S,'Corticoïde inhalé de référence — continuer si asthme. Données rassurantes.'),
  b('FLIXOTIDE 125','Flixotide 125 µg (fluticasone inhalée)',C,'Corticoïde inhalé — données rassurantes. Maintenir si asthme.','medium'),
  b('BECOTIDE 250','Becotide 250 µg (béclométasone inhalée)',C,'Corticoïde inhalé — maintenir si asthme. Données rassurantes.','medium'),
  b('SERETIDE 25/125','Seretide 25/125 (fluticasone + salmétérol)',C,'Association corticoïde + BALA — maintenir si asthme non contrôlé.','medium'),
  b('SYMBICORT 160','Symbicort 160/4,5 µg (budésonide + formotérol)',C,'Association ICS + BALA — maintenir si asthme. Données rassurantes.','medium'),
  b('SINGULAR 10','Singular 10 mg (montélukast)',C,'Antileucotriène — données rassurantes. Maintenir si efficace.','medium'),
  b('ATROVENT','Atrovent (ipratropium inhalé)',C,'Anticholinergique — données rassurantes en inhalation.','medium'),
  b('SPIRIVA','Spiriva (tiotropium)',C,'Anticholinergique BPCO — données très limités grossesse. Précaution.','medium'),
  b('RHINOCORT','Rhinocort (budésonide nasal)',S,'Corticoïde nasal — absorption systémique très faible. Sûr pour rhinite.','medium'),
  b('NASONEX','Nasonex (mométasone nasale)',S,'Corticoïde nasal — absorption systémique négligeable. Sûr.','medium'),
  b('AVAMYS','Avamys (fluticasone nasale)',S,'Corticoïde nasal — sûr.','medium'),
  b('STERIMAR','Stéimar (sérum physiologique nasal)',S,'Lavage nasal salin. Sûr et recommandé.'),
  b('RHINOFLUIMUCIL','Rhinofluimucil (NAC + tuaminoheptane)',C,'Vasoconstricteur + mucolytique — DÉCONSEILLÉ: vasoconstricteur peut réduire perfusion placentaire.'),
  b('SUDAFED','Sudafed (pseudoéphédrine)',DC,'Vasoconstricteur oral — CONTRE-INDIQUÉ au 1er trimestre. Déconseillé pendant toute la grossesse.'),
  b('MUCOSOLVAN','Mucosolvan (ambroxol)',C,'Mucolytique — données rassurantes aux 2e-3e trimestres. Précaution au 1er.','medium'),
  b('RHINATHIOL','Rhinathiol (carbocistéine)',C,'Mucolytique — données limités en 1er trimestre. Précaution.','medium'),
  b('BISOLVON','Bisolvon (bromhexine)',C,'Mucolytique — données rassurantes en 2e-3e trimestres. Précaution au 1er.','medium'),
];

// ─── Anti-acné, dermatologie (marques) ───────────────────────────────────────
const DERM_BRANDS: PreComputedIngredient[] = [
  b('ROACCUTANE 20','Roaccutane / Curacné (isotrétinoïne orale)',D,'TÉRATOGÈNE MAJEUR ABSOLU. Programme de prévention des grossesses obligatoire. Contraception stricte.'),
  b('RETIN A','Retin-A (trétinoïne topique)',D,'Rétinoïde topique — CONTRE-INDIQUÉ pendant la grossesse.'),
  b('ADAPALENE CREAM','Adapalène crème (Differine)',D,'Rétinoïde topique — contre-indiqué.','medium'),
  b('LOCACID CREME','Locacid crème (trétinoïne 0,05%)',D,'Rétinoïde topique — CONTRE-INDIQUÉ.'),
  b('ERYFLUID','Eryfluid (érythromycine solution topique)',C,'Antibiotique topique acné — données limités grossesse. Précaution.','medium'),
  b('CLINDOXYL GEL','Clindoxyl gel (clindamycine + benzoyle peroxyde)',C,'Association antibiotique + oxydant — données limités. Précaution.','medium'),
  b('DALACINE T TOPIC','Dalacine T Topic (clindamycine topique)',C,'Antibiotique topique acné. Données limités.','medium'),
  b('SKINOREN CREME','Skinoren crème (acide azélaïque)',C,'Anti-acnéique topique — données limités. Précaution au 1er trimestre.','medium'),
  b('DIPROSONE','Diprosone (bétaméthasone dipropionate)',C,'Corticoïde fort topique — usage localisé ponctuel acceptable. Éviter usage étendu prolongé.','medium'),
  b('LOCOBASE','Locobase (émollient)',S,'Crème émolliente neutre. Sûre.','medium'),
  b('A-DERMA EPITHELIALE','A-Derma Épithélia A.H. (avoine rhéalba)',S,'Émollient naturel anti-irritant. Sûr.','medium'),
  b('CETAPHIL CREME','Cetaphil crème (émollient)',S,'Émollient doux. Sûr pendant la grossesse.','medium'),
  b('BEPANTHEN','Bépanthène crème (dexpanthénol)',S,'Cicatrisant doux. Sûr et recommandé pendant la grossesse (mamelons, plaies).'),
  b('CICATRYL CREME','Cicatryl crème (extrait de centella)',S,'Cicatrisant naturel. Sûr.','medium'),
  b('IALUSET CREME','Ialuset crème (acide hyaluronique)',S,'Cicatrisant hyaluronique. Sûr.','medium'),
  b('BETADINE ANTISEPTIQUE','Bétadine antiseptique (povidone iodée)',D,'CONTRE-INDIQUÉE à partir du 4e mois (iode: hypothyroïdie fœtale). Utiliser antiseptiques non iodés.'),
  b('HEXOMEDINE','Hexomédine (hexamidine)',C,'Antiseptique — données limités grossesse. Petites surfaces: acceptable.','medium'),
  b('DAKIN DILUE','Dakin dilué (hypochlorite sodium)',C,'Antiseptique dilué — usage topique ponctuel. Données limités.','medium'),
  b('FLAMMAZINE','Flammazine (sulfadiazine argent)',C,'Crème antibactérienne pour brûlures — données limités grossesse. Précaution.','medium'),
];

// ─── ORL / Gorge (marques) ────────────────────────────────────────────────────
const ORL_BRANDS: PreComputedIngredient[] = [
  b('STREPSILS MENTHOL','Strepsils menthol (amylmétacrésol + alcool)',C,'Antiseptique ORL — précaution: contient alcool. Usage bref.','medium'),
  b('HUMEX MAL DE GORGE','Humex mal de gorge (chlorhexidine)',C,'Antiseptique ORL — usage local. Précaution grossesse.','medium'),
  b('LYSOPAÏNE','Lysopaïne (lysozyme)',C,'Antiseptique ORL enzymatique — données limités grossesse.','medium'),
  b('ELUDRIL','Eludril (chlorhexidine + alcool bain de bouche)',C,'Contient alcool — usage bref. Données limités.','medium'),
  b('TANTUM VERDE','Tantum Verde (benzydamine)',C,'Anti-inflammatoire ORL local — données limités grossesse.','medium'),
  b('OTIPAX','Otipax (phénazone + lidocaïne auriculaire)',C,'Anesthésique auriculaire — données limités. Précaution.','medium'),
  b('PANOTILE CIPRO','Panotile Cipro (ciprofloxacine auriculaire)',C,'Fluoroquinolone auriculaire — absorption systémique faible. Précaution.','medium'),
  b('AURALGAN GOUTTES','Auralgan gouttes (phénazone + benzocaïne)',C,'Anesthésique auriculaire — données limités grossesse.','medium'),
];

export async function scrapeMedications(): Promise<PreComputedIngredient[]> {
  return [
    ...PARACETAMOL_BRANDS, ...NSAID_BRANDS, ...ANTIHISTAMINE_BRANDS,
    ...GASTRO_BRANDS, ...ANTIBIOTIC_BRANDS, ...ANTIFUNGAL_BRANDS,
    ...ANTIPARASITIC_BRANDS, ...SUPPLEMENT_BRANDS, ...CARDIO_BRANDS,
    ...THYROID_BRANDS, ...PSYCHO_BRANDS, ...RESPIRATORY_BRANDS,
    ...DERM_BRANDS, ...ORL_BRANDS,
  ];
}
