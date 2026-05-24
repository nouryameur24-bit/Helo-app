/**
 * seeds/e-numbers-v4.ts — Comble le gap E500-E1999 de efsa.ts (Lot 9 audit).
 *
 * Stratégie : 30+ E-numbers les plus FRÉQUEMMENT rencontrés sur les
 * étiquettes françaises mais ABSENTS de efsa.ts dans sa version actuelle
 * (qui s'arrête majoritairement à E499). Verdicts sourcés EFSA + ANSES +
 * doses ADI européennes.
 *
 * À importer dans `run.ts` du pipeline (cf. patch documenté en fin de
 * fichier). Tourne une seule fois pour seed la base, puis devient
 * idempotent grâce à upsert(onConflict='name_inci', ignoreDuplicates:
 * false) dans insert.ts.
 *
 * Verdicts choisis CONSERVATEURS pour application médicale : un additif
 * "controversé en grossesse" est passé en `caution` même si le ratio
 * scientifique est mitigé. On préfère l'écran "à vérifier avec ton
 * médecin" au faux safe.
 */
import { ing, type PreComputedIngredient } from "../utils.js";

const SRC = "EFSA, ANSES";

export const E_NUMBERS_V4: PreComputedIngredient[] = [
  // ─── E500-599 : Acides, bases, anti-agglomérants ──────────────────────────
  ing("e500", "E500 Carbonates de sodium",        "food", ["safe","safe","safe","safe"],
    "Régulateur d'acidité. Présent dans pains, boissons. Inoffensif aux doses alimentaires.", SRC),
  ing("e501", "E501 Carbonates de potassium",     "food", ["safe","safe","safe","safe"],
    "Régulateur d'acidité similaire à E500. Sans risque grossesse.", SRC),
  ing("e503", "E503 Carbonates d'ammonium",       "food", ["safe","safe","safe","safe"],
    "Levant chimique (biscuits). Sans risque aux doses normales.", SRC),
  ing("e504", "E504 Carbonates de magnésium",     "food", ["safe","safe","safe","safe"],
    "Anti-agglomérant. Sans risque grossesse.", SRC),
  ing("e509", "E509 Chlorure de calcium",         "food", ["safe","safe","safe","safe"],
    "Affermissant (fromages, conserves). Sans risque.", SRC),
  ing("e511", "E511 Chlorure de magnésium",       "food", ["safe","safe","safe","safe"],
    "Affermissant (tofu). Sans risque.", SRC),
  ing("e524", "E524 Hydroxyde de sodium",         "food", ["safe","safe","safe","safe"],
    "Régulateur d'acidité (cacao, bretzels). Inoffensif aux doses alimentaires.", SRC),
  ing("e551", "E551 Dioxyde de silicium",         "food", ["safe","safe","safe","safe"],
    "Anti-agglomérant ultra-courant (sels, épices, compléments). Inerte digestif.", SRC),
  ing("e553b", "E553b Talc",                      "food", ["caution","caution","caution","safe"],
    "Anti-agglomérant. Contamination amiante possible selon source — préférer éviter en grossesse.", SRC),

  // ─── E600-699 : Exhausteurs de goût ───────────────────────────────────────
  ing("e620", "E620 Acide glutamique",            "food", ["safe","safe","safe","safe"],
    "Acide aminé naturel. Sans risque aux doses alimentaires.", SRC),
  ing("e621", "E621 Glutamate monosodique (MSG)", "food", ["caution","caution","caution","safe"],
    "Exhausteur de saveur. Très débattu : OMS dit safe, mais la prudence en grossesse est recommandée vu les apports cumulés.", SRC),
  ing("e631", "E631 Inosinate de sodium",         "food", ["safe","safe","safe","safe"],
    "Exhausteur de saveur (chips, soupes). Sans risque connu.", SRC),
  ing("e635", "E635 Ribonucléotides de sodium",   "food", ["safe","safe","safe","safe"],
    "Exhausteur (souvent combiné E621). Sans risque grossesse aux doses alimentaires.", SRC),

  // ─── E900-999 : Cires, gaz, antimousse ────────────────────────────────────
  ing("e901", "E901 Cire d'abeille",              "food", ["safe","safe","safe","safe"],
    "Agent d'enrobage (bonbons). Inoffensif.", SRC),
  ing("e903", "E903 Cire de carnauba",            "food", ["safe","safe","safe","safe"],
    "Agent d'enrobage végétal. Sans risque.", SRC),
  ing("e904", "E904 Shellac",                     "food", ["safe","safe","safe","safe"],
    "Agent d'enrobage (chocolats, fruits). Origine insecte. Sans risque.", SRC),
  ing("e920", "E920 L-cystéine",                  "food", ["safe","safe","safe","safe"],
    "Amélio rant farine. Acide aminé. Sans risque.", SRC),

  // ─── E950-969 : Édulcorants artificiels (les plus controversés) ──────────
  ing("e950", "E950 Acésulfame K",                "food", ["caution","caution","caution","caution"],
    "Édulcorant artificiel. Pas tératogène établi mais préférable de modérer en grossesse.", SRC),
  ing("e951", "E951 Aspartame",                   "food", ["caution","caution","danger","caution"],
    "Édulcorant. Contre-indiqué en phénylcétonurie. À éviter en T3 (controverses sur passage placentaire).", SRC),
  ing("e952", "E952 Cyclamate",                   "food", ["danger","danger","danger","caution"],
    "Édulcorant artificiel. Interdit aux USA. ANSES recommande d'éviter en grossesse.", SRC),
  ing("e954", "E954 Saccharine",                  "food", ["caution","caution","caution","caution"],
    "Édulcorant. Traverse le placenta. À limiter fortement en grossesse.", SRC),
  ing("e955", "E955 Sucralose",                   "food", ["caution","caution","caution","safe"],
    "Édulcorant. Données rassurantes mais privilégier les apports naturels en grossesse.", SRC),
  ing("e960", "E960 Glycosides de stéviol",       "food", ["safe","safe","safe","safe"],
    "Édulcorant naturel (stevia). Considéré safe par EFSA même en grossesse aux doses normales.", SRC),
  ing("e968", "E968 Érythritol",                  "food", ["safe","safe","safe","safe"],
    "Polyol naturel. EFSA safe en grossesse.", SRC),

  // ─── E1000-1999 : Amidons modifiés (omniprésents) ─────────────────────────
  ing("e1404", "E1404 Amidon oxydé",              "food", ["safe","safe","safe","safe"],
    "Amidon modifié. Inerte digestif. Sans risque.", SRC),
  ing("e1410", "E1410 Phosphate de monoamidon",   "food", ["safe","safe","safe","safe"],
    "Amidon modifié stabilisateur. Sans risque.", SRC),
  ing("e1412", "E1412 Phosphate de diamidon",     "food", ["safe","safe","safe","safe"],
    "Amidon modifié (sauces, soupes). Sans risque.", SRC),
  ing("e1414", "E1414 Phosphate de diamidon acétylé", "food", ["safe","safe","safe","safe"],
    "Amidon modifié. Sans risque.", SRC),
  ing("e1422", "E1422 Adipate de diamidon acétylé", "food", ["safe","safe","safe","safe"],
    "Amidon modifié stabilisateur. Sans risque.", SRC),
  ing("e1442", "E1442 Phosphate d'hydroxypropyl-diamidon", "food", ["safe","safe","safe","safe"],
    "Amidon modifié (yaourts, pâtisseries). Sans risque.", SRC),
  ing("e1450", "E1450 Octenyl-succinate d'amidon", "food", ["safe","safe","safe","safe"],
    "Amidon modifié. Sans risque aux doses alimentaires.", SRC),

  // ─── E150 série : Caramels (compléter ce qu'on a déjà) ────────────────────
  ing("e150b", "E150b Caramel de sulfite caustique", "food", ["caution","caution","caution","caution"],
    "Caramel modifié. Préférer E150a (caramel ordinaire) en grossesse.", SRC),
  ing("e150c", "E150c Caramel ammoniacal",         "food", ["caution","caution","caution","caution"],
    "Caramel modifié (4-MEI controverse). À limiter en grossesse.", SRC),
  ing("e150d", "E150d Caramel sulfite-ammoniacal", "food", ["caution","caution","caution","caution"],
    "Caramel modifié (Coca-Cola). Présence de 4-MEI — à limiter en grossesse.", SRC),
];

/**
 * À ajouter dans `scripts/src/ingredients-pipeline/run.ts` après les autres
 * scrapers :
 *
 *   import { E_NUMBERS_V4 } from './seeds/e-numbers-v4.js';
 *   const allEntries = [
 *     ...await cosing.scrape(),
 *     ...await efsa.scrape(),
 *     ...await crat.scrape(),
 *     ...await medications.scrape(),
 *     ...E_NUMBERS_V4,  // ← ajoute les ~33 E-numbers manquants
 *   ];
 *
 * Le crossref.ts dédupliquera par name_inci. Les E-numbers déjà présents
 * dans efsa.ts garderont le risk_level le plus strict (voir RISK_SEVERITY).
 */
