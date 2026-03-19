export type RiskLevel = 'safe' | 'caution' | 'danger' | 'no_signal';
export type Verdict = 'safe' | 'caution' | 'danger';
export type Category = 'cosmetic' | 'food' | 'medication';
export type Trimester = 1 | 2 | 3;
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
  description_fr: string;
  source: string;
  source_url: string | null;
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
  source?: string;
}

export interface MatchResult {
  ingredientName: string;
  matched: boolean;
  ingredient?: IngredientData;
  riskLevel: RiskLevel;
}

export interface VerdictResult {
  verdict: Verdict;
  flaggedIngredients: MatchResult[];
  noSignalCount: number;
  safeCount: number;
}

export interface ScanCache {
  barcode: string;
  product: ProductData;
  matches: MatchResult[];
  verdict: VerdictResult;
  cachedAt: number;
}

export interface OcrScanResult {
  product: ProductData;
  matches: MatchResult[];
  verdict: VerdictResult;
  isOCR: true;
  savedAt: number;
}
