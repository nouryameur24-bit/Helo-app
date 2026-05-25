export type RiskLevel = 'safe' | 'caution' | 'danger' | 'no_signal';
export type Verdict = 'safe' | 'caution' | 'danger';
export type Category = 'cosmetic' | 'food' | 'medication';
export type Trimester = 1 | 2 | 3;
export type Phase = Trimester | 'breastfeeding' | 'baby';
export type UserRole = 'pregnant' | 'partner';

export interface UserProfile {
  userId: string;
  firstName: string;
  dueDate: string | null;
  trimester: number | null;
  partnerCode: string | null;
  categories: string[];
  createdAt: string;
}

export interface PartnerLink {
  id: string;
  pregnantUserId: string;
  partnerUserId: string;
  linkedAt: string;
}

export interface ProfileState {
  userId: string;
  role: UserRole;
  firstName: string;
  trimester: number | null;
  dueDate: string | null;
  partnerCode: string | null;
  linkedUserId: string | null;
  linkedFirstName: string | null;
  isLoading: boolean;
  babyMode: boolean;
  breastfeedingMode: boolean;
}

export interface IngredientData {
  id: string;
  name: string;
  name_inci: string;
  synonyms: string[];
  category: Category;
  risk_level_t1: RiskLevel;
  risk_level_t2: RiskLevel;
  risk_level_t3: RiskLevel;
  risk_level_breastfeeding: RiskLevel;
  risk_level_baby?: RiskLevel;
  description_fr: string;
  source: string;
  source_url: string | null;
  // ── Lot 17-04 : dosage recommandé pendant grossesse ────────────────────
  /** Dose journalière max recommandée (CRAT/ANSM). Null si non applicable. */
  max_dose_mg_per_day?: number | null;
  /** Unité affichée à l'utilisatrice. Ex: "mg", "g", "ml", "tasses". */
  dose_unit?: string | null;
  /** Note 1 phrase sur la posologie. */
  dose_note?: string | null;
}

export interface ProductData {
  barcode?: string;
  name: string;
  brand?: string;
  imageUrl?: string | null;
  ingredientsRaw?: string;
  ingredientsList: string[];
  categories?: string[];
  nutriscore?: string | null;
  ecoscore?: string | null;
  source?: 'openfoodfacts' | 'openbeautyfacts' | 'manual' | 'community' | 'helo';
  isPhotoIdentified?: boolean;
  /** Lot 18-06 — Nombre de contributions communautaires sur ce produit
   *  (scan_count metadata). Affiché en badge "X mamas ont contribué"
   *  sur le verdict screen. Présent UNIQUEMENT pour les produits issus
   *  d'un ghost capture (source='community'). */
  communityContributionCount?: number;
}

export interface MatchResult {
  ingredientName: string;
  matched: boolean;
  ingredient?: IngredientData;
  riskLevel: RiskLevel;
  /** Lot 17-02 — Si cet ingrédient déclenche une allergie déclarée par
   *  l'utilisateur (ex: "Lait", "Arachide"), le label de l'allergie est
   *  attaché ici. Vide sinon. Utilisé par `getVerdict` pour produire
   *  `allergyWarnings` côté VerdictResult, et par l'UI pour expliquer
   *  pourquoi un ingrédient est passé en "danger". */
  matchedAllergies?: string[];
}

export interface VerdictResult {
  verdict: Verdict;
  flaggedIngredients: MatchResult[];
  noSignalCount: number;
  safeCount: number;
  // ── Lot 17-01 : Transparence sur l'incertitude ─────────────────────────
  /** Total d'ingrédients analysés (= matches.length). Pour ratio. */
  totalCount: number;
  /** True si AUCUN ingrédient n'a été reconnu (matched=false partout).
   *  Le verdict "safe" est alors trompeur — on ne SAIT pas, on n'a juste
   *  pas trouvé de signal négatif. UI doit poser un disclaimer fort. */
  allIngredientsUnknown: boolean;
  /** Ratio d'ingrédients non reconnus (0..1). Si >0.5, la fiabilité du
   *  verdict est compromise — UI affiche bannière "Composition partiellement
   *  reconnue" pour éviter le faux ✅ "tout va bien". */
  unknownRatio: number;
  // ── Lot 17-02 : Allergies user croisées ────────────────────────────────
  /** Ingrédients matchés qui correspondent à une allergie déclarée par
   *  l'utilisateur dans les préférences. Affiché en bannière rouge bloquante
   *  sur le verdict screen. Le champ est vide si aucune allergie déclarée
   *  ou aucun match. */
  allergyWarnings?: string[];
  // ── Champs optionnels fournis par le backend hybride ───────────────────
  // Présents quand le scan a transité par POST /api/scan (mode en ligne).
  // Absents en mode offline (matching local pur).
  aiExplanation?: string;
  aiSource?: 'deterministic' | 'ai';
  glowScoreRemote?: number; // score calculé côté backend (0-100)
  searchKeyword?: string | null; // pour la recherche d'alternatives sûres
}

export interface ScanCache {
  barcode: string;
  product: ProductData;
  matches: MatchResult[];
  verdict: VerdictResult;
  babyMatches?: MatchResult[];
  babyVerdict?: VerdictResult;
  cachedAt: number;
}

export interface OcrScanResult {
  product: ProductData;
  matches: MatchResult[];
  verdict: VerdictResult;
  babyMatches?: MatchResult[];
  babyVerdict?: VerdictResult;
  isOCR: true;
  savedAt: number;
}
