// ─── Nutrition Needs per Phase — Hēlo ────────────────────────────────────────

export type NutrientKey =
  | 'folate'
  | 'iron'
  | 'vitaminD'
  | 'calcium'
  | 'omega3'
  | 'vitaminK'
  | 'fiber'
  | 'iodine';

export type ImportanceLevel = 1 | 2 | 3; // + | ++ | +++

// ─── Per-nutrient metadata ────────────────────────────────────────────────────
export interface NutrientDef {
  key: NutrientKey;
  name: string;
  emoji: string;
  description: string;
  // product-name keywords that indicate a contribution (case-insensitive)
  keywords: string[];
  // contribution per keyword match (0–100), summed then capped at 100
  contributionPerMatch: number;
}

export const NUTRIENT_DEFS: Record<NutrientKey, NutrientDef> = {
  folate: {
    key: 'folate',
    name: 'Acide folique (B9)',
    emoji: '🥦',
    description: 'Essentiel pour le développement du système nerveux.',
    keywords: ['épinard', 'brocoli', 'lentille', 'pois', 'asperge', 'chou', 'haricot', 'fève', 'avocat', 'mangue'],
    contributionPerMatch: 28,
  },
  iron: {
    key: 'iron',
    name: 'Fer',
    emoji: '🥩',
    description: 'Prévient l\'anémie et soutient le développement du bébé.',
    keywords: ['viande', 'bœuf', 'agneau', 'foie', 'boudin', 'lentille', 'épinard', 'tofu', 'quinoa', 'fruits de mer', 'huître'],
    contributionPerMatch: 22,
  },
  vitaminD: {
    key: 'vitaminD',
    name: 'Vitamine D',
    emoji: '☀️',
    description: 'Favorise l\'absorption du calcium et la santé osseuse.',
    keywords: ['saumon', 'sardine', 'maquereau', 'thon', 'lait', 'œuf', 'champignon', 'hareng'],
    contributionPerMatch: 30,
  },
  calcium: {
    key: 'calcium',
    name: 'Calcium',
    emoji: '🥛',
    description: 'Construction du squelette du bébé, santé osseuse maternelle.',
    keywords: ['lait', 'fromage', 'yaourt', 'yaourtlaitier', 'laitier', 'kéfir', 'amande', 'brocoli', 'tofu', 'sardine', 'chou'],
    contributionPerMatch: 25,
  },
  omega3: {
    key: 'omega3',
    name: 'Oméga-3',
    emoji: '🐟',
    description: 'Développement du cerveau et de la rétine du bébé.',
    keywords: ['saumon', 'sardine', 'maquereau', 'hareng', 'anchois', 'noix', 'lin', 'chia', 'colza'],
    contributionPerMatch: 30,
  },
  vitaminK: {
    key: 'vitaminK',
    name: 'Vitamine K',
    emoji: '🥬',
    description: 'Coagulation sanguine, santé osseuse en fin de grossesse.',
    keywords: ['chou', 'épinard', 'brocoli', 'salade', 'persil', 'roquette', 'basilic', 'kale'],
    contributionPerMatch: 35,
  },
  fiber: {
    key: 'fiber',
    name: 'Fibres',
    emoji: '🌾',
    description: 'Prévient la constipation fréquente en T3.',
    keywords: ['céréale', 'avoine', 'son', 'lentille', 'haricot', 'poire', 'pomme', 'figue', 'pruine', 'pain complet', 'riz complet', 'quinoa'],
    contributionPerMatch: 20,
  },
  iodine: {
    key: 'iodine',
    name: 'Iode',
    emoji: '🌊',
    description: 'Développement thyroïdien, production de lait maternel.',
    keywords: ['poisson', 'fruits de mer', 'crevette', 'moule', 'huître', 'crabe', 'algue', 'lait', 'yaourt', 'fromage'],
    contributionPerMatch: 28,
  },
};

// ─── Importance stars ─────────────────────────────────────────────────────────
export interface PhaseNeed {
  key: NutrientKey;
  importance: ImportanceLevel;
  tip: string;
}

export const PHASE_NEEDS: Record<string, PhaseNeed[]> = {
  '1': [
    {
      key: 'folate',
      importance: 3,
      tip: 'L\'acide folique est crucial pour prévenir les malformations du tube neural.',
    },
    {
      key: 'iron',
      importance: 1,
      tip: 'Le fer soutient l\'expansion du volume sanguin maternel.',
    },
    {
      key: 'vitaminD',
      importance: 1,
      tip: 'La vitamine D renforce vos os et l\'immunité.',
    },
  ],
  '2': [
    {
      key: 'calcium',
      importance: 3,
      tip: 'Le squelette du bébé se construit activement — 1000mg/jour recommandés.',
    },
    {
      key: 'iron',
      importance: 2,
      tip: 'Vos besoins en fer augmentent avec le volume sanguin.',
    },
    {
      key: 'omega3',
      importance: 2,
      tip: 'Les oméga-3 (DHA) participent au développement cérébral du bébé.',
    },
    {
      key: 'vitaminD',
      importance: 2,
      tip: 'Associée au calcium pour une absorption optimale.',
    },
  ],
  '3': [
    {
      key: 'iron',
      importance: 3,
      tip: 'Les réserves en fer de votre bébé se constituent maintenant.',
    },
    {
      key: 'calcium',
      importance: 2,
      tip: 'La minéralisation osseuse s\'accélère en fin de grossesse.',
    },
    {
      key: 'vitaminK',
      importance: 1,
      tip: 'La vitamine K prépare la coagulation sanguine pour l\'accouchement.',
    },
    {
      key: 'fiber',
      importance: 2,
      tip: 'Les fibres préviennent la constipation, très fréquente au T3.',
    },
  ],
  breastfeeding: [
    {
      key: 'calcium',
      importance: 3,
      tip: 'La production de lait puise dans vos réserves de calcium.',
    },
    {
      key: 'vitaminD',
      importance: 2,
      tip: 'Le lait maternel peut manquer de vitamine D — consultez votre médecin.',
    },
    {
      key: 'omega3',
      importance: 2,
      tip: 'Les oméga-3 continuent de soutenir le développement cérébral.',
    },
    {
      key: 'iodine',
      importance: 2,
      tip: 'L\'iode est essentielle pour la production de lait et la thyroïde.',
    },
  ],
  baby: [],
};

// ─── Recommended food sources per phase ──────────────────────────────────────
export interface FoodSource {
  emoji: string;
  name: string;
  nutrients: NutrientKey[];
  tip: string;
}

export const FOOD_SOURCES_BY_PHASE: Record<string, FoodSource[]> = {
  '1': [
    { emoji: '🥦', name: 'Brocoli', nutrients: ['folate', 'vitaminK', 'vitaminD'], tip: 'Riche en B9 et vitamine C' },
    { emoji: '🥚', name: 'Œufs', nutrients: ['iron', 'vitaminD'], tip: 'Excellente source de vitamine D' },
    { emoji: '🫘', name: 'Lentilles', nutrients: ['folate', 'iron', 'fiber'], tip: 'Double richesse : B9 + fer' },
    { emoji: '🥑', name: 'Avocat', nutrients: ['folate', 'omega3'], tip: '82µg de B9 pour 100g' },
    { emoji: '🍊', name: 'Agrumes', nutrients: ['folate'], tip: 'La vitamine C améliore l\'absorption du fer' },
    { emoji: '🐟', name: 'Poisson gras', nutrients: ['vitaminD', 'omega3', 'iodine'], tip: 'Max 2x/semaine pendant la grossesse' },
  ],
  '2': [
    { emoji: '🥛', name: 'Produits laitiers', nutrients: ['calcium', 'vitaminD', 'iodine'], tip: '3 portions/jour recommandées' },
    { emoji: '🐟', name: 'Saumon', nutrients: ['omega3', 'vitaminD', 'iodine'], tip: 'DHA essentiel au cerveau' },
    { emoji: '🥩', name: 'Viande rouge (cuite)', nutrients: ['iron'], tip: 'Fer héminique très bien absorbé' },
    { emoji: '🫘', name: 'Légumineuses', nutrients: ['iron', 'folate', 'fiber', 'calcium'], tip: 'Associez à la vitamine C pour absorber le fer' },
    { emoji: '🌰', name: 'Amandes', nutrients: ['calcium', 'omega3'], tip: 'Une poignée couvre 8% des besoins en calcium' },
    { emoji: '🥬', name: 'Légumes verts', nutrients: ['calcium', 'folate', 'vitaminK'], tip: 'Épinard, chou kale, brocoli' },
    { emoji: '🥚', name: 'Œufs', nutrients: ['vitaminD', 'iron'], tip: 'Riche en choline pour le cerveau bébé' },
  ],
  '3': [
    { emoji: '🩸', name: 'Boudin noir (bien cuit)', nutrients: ['iron'], tip: 'Source de fer héminique exceptionnelle' },
    { emoji: '🥩', name: 'Foie de veau (cuit)', nutrients: ['iron', 'vitaminK'], tip: 'Très riche en fer — max 1x/semaine' },
    { emoji: '🫘', name: 'Lentilles', nutrients: ['iron', 'fiber', 'folate'], tip: 'Fer végétal + fibres anticonst' },
    { emoji: '🥛', name: 'Produits laitiers', nutrients: ['calcium', 'vitaminD'], tip: 'Minéralisation osseuse bébé ↑' },
    { emoji: '🥦', name: 'Brocoli', nutrients: ['vitaminK', 'calcium', 'fiber'], tip: 'Vitamine K pour la coagulation' },
    { emoji: '🌾', name: 'Céréales complètes', nutrients: ['fiber', 'iron'], tip: 'Pain complet, avoine, quinoa' },
    { emoji: '🐟', name: 'Poisson gras', nutrients: ['omega3', 'vitaminD'], tip: 'Pour les dernières semaines de dév cérébral' },
  ],
  breastfeeding: [
    { emoji: '🥛', name: 'Produits laitiers', nutrients: ['calcium', 'vitaminD', 'iodine'], tip: 'Vos réserves de calcium se régénèrent' },
    { emoji: '🐟', name: 'Poisson gras', nutrients: ['omega3', 'vitaminD', 'iodine'], tip: 'DHA dans le lait maternel' },
    { emoji: '🌊', name: 'Fruits de mer', nutrients: ['iodine', 'iron'], tip: 'Excellente source d\'iode' },
    { emoji: '🌰', name: 'Noix & graines', nutrients: ['omega3', 'calcium'], tip: 'Lin, chia, noix — sources végétales d\'oméga-3' },
    { emoji: '🥬', name: 'Légumes verts', nutrients: ['calcium', 'vitaminK', 'folate'], tip: 'Kale, brocoli, épinard' },
    { emoji: '🫘', name: 'Légumineuses', nutrients: ['iron', 'fiber', 'calcium'], tip: 'Protéines + fer pour récupérer' },
  ],
  baby: [],
};

// ─── Caffeine detection keywords ──────────────────────────────────────────────
export const CAFFEINE_KEYWORDS = ['café', 'coffee', 'expresso', 'cappuccino', 'thé', 'tea', 'cola', 'energy', 'energisant', 'guarana', 'matcha'];
