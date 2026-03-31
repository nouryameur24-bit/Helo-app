// ─── Weekly Recipe Rotations — Hēlo ──────────────────────────────────────────
// 4 weekly rotations × 5 phases. Content cycles every Monday.
import type { NutrientKey } from './nutritionNeeds';

export interface Recipe {
  id: string;
  emoji: string;
  title: string;
  duration: string;           // e.g. "20 min"
  difficulty: 'Facile' | 'Moyen';
  nutrients: NutrientKey[];
  ingredients: string[];
  steps: string;
  safeNote?: string;          // Short safety note for pregnancy
}

// Helper: 4 rotations (index 0-3) cycling every ISO week
export function getWeekRotation(): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(Date.now() / msPerWeek) % 4;
}

// ─── T1 Recipes ───────────────────────────────────────────────────────────────
const T1_RECIPES: Recipe[][] = [
  // Rotation 0
  [
    {
      id: 't1-0-a',
      emoji: '🥗',
      title: 'Salade de lentilles & avocat',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'iron', 'fiber'],
      ingredients: ['150g lentilles cuites', '1 avocat', '1 tomate', 'jus de citron', 'huile d\'olive', 'persil'],
      steps: 'Mélangez les lentilles avec l\'avocat en dés et la tomate. Assaisonnez avec citron, huile et persil.',
      safeNote: 'Parfait en T1 — acide folique et fer en un seul plat.',
    },
    {
      id: 't1-0-b',
      emoji: '🍳',
      title: 'Œufs cocotte aux épinards',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'iron', 'vitaminD'],
      ingredients: ['4 œufs', '200g épinards frais', '2 cs crème fraîche', 'muscade', 'sel'],
      steps: 'Faites revenir les épinards. Répartissez-les dans des ramequins avec la crème. Cassez un œuf par dessus. Cuisez 12 min à 180°C.',
      safeNote: 'Bien cuire les œufs jusqu\'à solidification.',
    },
    {
      id: 't1-0-c',
      emoji: '🥑',
      title: 'Tartines avocat-brocoli',
      duration: '10 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'vitaminK'],
      ingredients: ['2 tranches pain complet', '1 avocat', '100g brocoli cuit', 'sel', 'piment doux'],
      steps: 'Écrasez l\'avocat. Étalez sur le pain. Ajoutez le brocoli en petits bouquets. Assaisonnez.',
    },
  ],
  // Rotation 1
  [
    {
      id: 't1-1-a',
      emoji: '🍲',
      title: 'Soupe de lentilles corail',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'iron', 'fiber'],
      ingredients: ['150g lentilles corail', '1 carotte', '1 oignon', '1 cc curcuma', 'bouillon de légumes'],
      steps: 'Faites revenir l\'oignon. Ajoutez carotte, lentilles, épices et bouillon. Cuire 20 min. Mixez.',
    },
    {
      id: 't1-1-b',
      emoji: '🥞',
      title: 'Galettes de brocoli fromage',
      duration: '20 min',
      difficulty: 'Moyen',
      nutrients: ['folate', 'calcium', 'vitaminK'],
      ingredients: ['300g brocoli cuit', '2 œufs', '50g fromage râpé', '2 cs farine', 'sel'],
      steps: 'Mixez le brocoli. Mélangez avec œufs, fromage, farine. Formez des galettes. Cuire à la poêle 3 min/côté.',
      safeNote: 'Galettes bien cuites à cœur.',
    },
    {
      id: 't1-1-c',
      emoji: '🍊',
      title: 'Smoothie B9 : orange-épinard-banane',
      duration: '5 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'vitaminD'],
      ingredients: ['1 orange', '1 poignée épinards', '1 banane', '150ml lait ou boisson végétale'],
      steps: 'Mixez tous les ingrédients jusqu\'à consistance lisse. Servez immédiatement.',
    },
  ],
  // Rotation 2
  [
    {
      id: 't1-2-a',
      emoji: '🫛',
      title: 'Purée de petits pois menthe',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'fiber'],
      ingredients: ['300g petits pois surgelés', '1 cs menthe fraîche', '2 cs crème', 'sel'],
      steps: 'Cuire les petits pois 5 min. Mixez avec menthe et crème. Servez chaud ou froid.',
    },
    {
      id: 't1-2-b',
      emoji: '🥚',
      title: 'Omelette aux asperges',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'vitaminD', 'iron'],
      ingredients: ['4 œufs', '8 asperges vertes cuites', '1 cs persil', 'sel', 'huile d\'olive'],
      steps: 'Battez les œufs avec le persil. Chauffez l\'huile. Versez les œufs, posez les asperges. Pliez après 3 min.',
      safeNote: 'Omelette bien cuite.',
    },
    {
      id: 't1-2-c',
      emoji: '🫘',
      title: 'Bowl quinoa-fèves-avocat',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'iron', 'omega3'],
      ingredients: ['150g quinoa cuit', '100g fèves', '1 avocat', 'citron', 'huile d\'olive'],
      steps: 'Disposez quinoa, fèves et avocat en dés dans un bol. Arrosez de citron et huile.',
    },
  ],
  // Rotation 3
  [
    {
      id: 't1-3-a',
      emoji: '🥬',
      title: 'Salade d\'épinards aux oranges',
      duration: '10 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'iron'],
      ingredients: ['100g épinards frais', '1 orange', 'noix', 'vinaigrette légère'],
      steps: 'Mélangez épinards, suprêmes d\'orange et noix. Assaisonnez. La vitamine C aide l\'absorption du fer.',
    },
    {
      id: 't1-3-b',
      emoji: '🍝',
      title: 'Pâtes aux épinards et ricotta',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['folate', 'calcium', 'iron'],
      ingredients: ['200g pâtes complètes', '150g épinards', '100g ricotta', '1 gousse ail', 'sel'],
      steps: 'Cuisez les pâtes. Faites revenir ail et épinards. Mélangez avec ricotta et pâtes.',
    },
    {
      id: 't1-3-c',
      emoji: '🫑',
      title: 'Poivrons farcis aux lentilles',
      duration: '35 min',
      difficulty: 'Moyen',
      nutrients: ['folate', 'iron', 'fiber'],
      ingredients: ['2 poivrons', '200g lentilles vertes cuites', '1 tomate', 'herbes', 'fromage râpé'],
      steps: 'Coupez les poivrons en deux. Remplissez de lentilles assaisonnées. Couvrez de fromage. Four 25 min à 180°C.',
    },
  ],
];

// ─── T2 Recipes ───────────────────────────────────────────────────────────────
const T2_RECIPES: Recipe[][] = [
  // Rotation 0
  [
    {
      id: 't2-0-a',
      emoji: '🐟',
      title: 'Pavé de saumon en papillote',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['omega3', 'vitaminD', 'iodine'],
      ingredients: ['2 pavés de saumon', '1 citron', 'aneth', '1 cs huile d\'olive', 'sel'],
      steps: 'Posez le saumon sur papier sulfurisé. Arrosez de citron, aneth, huile. Fermez la papillote. Four 20 min à 180°C.',
      safeNote: 'Le saumon doit être bien cuit à cœur — pas cru.',
    },
    {
      id: 't2-0-b',
      emoji: '🥛',
      title: 'Lassi mangue yaourt',
      duration: '5 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'vitaminD'],
      ingredients: ['200ml yaourt nature', '1 mangue', '1 cc miel', 'cardamome'],
      steps: 'Mixez yaourt, mangue, miel et cardamome. Servez frais.',
    },
    {
      id: 't2-0-c',
      emoji: '🫘',
      title: 'Curry de pois chiches & épinards',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'iron', 'fiber'],
      ingredients: ['400g pois chiches', '150g épinards', '200ml lait de coco', '1 cc curcuma', '1 cc gingembre', '1 oignon'],
      steps: 'Faites revenir oignon et épices. Ajoutez pois chiches, épinards et lait de coco. Mijotez 15 min.',
    },
  ],
  // Rotation 1
  [
    {
      id: 't2-1-a',
      emoji: '🧀',
      title: 'Gratin de brocoli au fromage',
      duration: '30 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'vitaminK', 'vitaminD'],
      ingredients: ['400g brocoli', '200ml béchamel', '80g gruyère râpé', 'noix de muscade'],
      steps: 'Cuire le brocoli à l\'eau. Disposez dans un plat, nappez de béchamel, couvrez de gruyère. Four 20 min à 200°C.',
    },
    {
      id: 't2-1-b',
      emoji: '🐟',
      title: 'Tacos sardines avocat',
      duration: '10 min',
      difficulty: 'Facile',
      nutrients: ['omega3', 'calcium', 'vitaminD'],
      ingredients: ['1 boîte sardines à l\'huile', '1 avocat', '4 tortillas', 'coriandre', 'citron'],
      steps: 'Écrasez sardines et avocat. Assaisonnez de citron. Répartissez dans les tortillas avec coriandre.',
    },
    {
      id: 't2-1-c',
      emoji: '🥚',
      title: 'Frittata épinards fromage de chèvre',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'iron', 'vitaminD'],
      ingredients: ['6 œufs', '150g épinards', '80g fromage de chèvre pasteurisé', 'sel', 'poivre'],
      steps: 'Battez les œufs. Ajoutez épinards et fromage. Cuisez 5 min en poêle puis 10 min au four à 180°C.',
      safeNote: 'Fromage de chèvre pasteurisé uniquement.',
    },
  ],
  // Rotation 2
  [
    {
      id: 't2-2-a',
      emoji: '🌊',
      title: 'Moules marinières',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['iodine', 'iron', 'omega3'],
      ingredients: ['1kg moules nettoyées', '200ml vin blanc', '1 échalote', 'persil', 'beurre'],
      steps: 'Faites revenir l\'échalote au beurre. Ajoutez vin blanc et moules. Couvrez 5 min à feu vif. Servez avec persil.',
      safeNote: 'Les moules doivent être bien ouvertes et fumantes.',
    },
    {
      id: 't2-2-b',
      emoji: '🥜',
      title: 'Porridge amandes & fruits rouges',
      duration: '10 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'fiber', 'omega3'],
      ingredients: ['80g flocons d\'avoine', '300ml lait', '1 poignée amandes', 'fruits rouges', '1 cc miel'],
      steps: 'Cuire l\'avoine dans le lait. Servez avec amandes concassées, fruits rouges et miel.',
    },
    {
      id: 't2-2-c',
      emoji: '🥗',
      title: 'Bowl méditerranéen au thon',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['omega3', 'vitaminD', 'iron'],
      ingredients: ['1 boîte thon naturel', '100g quinoa cuit', '1 tomate', 'olives', 'concombre', 'citron'],
      steps: 'Disposez quinoa, thon émietté, légumes. Assaisonnez citron-huile.',
      safeNote: 'Max 2 portions de thon par semaine.',
    },
  ],
  // Rotation 3
  [
    {
      id: 't2-3-a',
      emoji: '🥘',
      title: 'Tajine de veau aux amandes',
      duration: '45 min',
      difficulty: 'Moyen',
      nutrients: ['iron', 'calcium', 'vitaminD'],
      ingredients: ['400g veau', '50g amandes', '1 oignon', '1 cc curcuma', '1 cc gingembre', 'bouillon'],
      steps: 'Faites revenir veau et oignon. Ajoutez épices, bouillon. Mijotez 35 min. Ajoutez amandes en fin.',
      safeNote: 'Viande bien cuite à cœur.',
    },
    {
      id: 't2-3-b',
      emoji: '🥛',
      title: 'Panna cotta légère au yaourt',
      duration: '15 min + 2h frigo',
      difficulty: 'Facile',
      nutrients: ['calcium', 'vitaminD'],
      ingredients: ['300ml yaourt grec', '150ml lait', '3 feuilles gélatine', 'miel', 'coulis framboises'],
      steps: 'Chauffez lait avec gélatine ramollie. Mélangez au yaourt. Répartissez en verrines. Réfrigérez 2h. Servez avec coulis.',
    },
    {
      id: 't2-3-c',
      emoji: '🐟',
      title: 'Saumon teriyaki & riz japonais',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['omega3', 'vitaminD', 'iodine'],
      ingredients: ['2 pavés saumon', '3 cs sauce soja', '2 cs miel', '200g riz', 'sésame'],
      steps: 'Marinhez le saumon soja-miel 10 min. Saisissez à la poêle 4 min/côté. Servez sur riz saupoudré de sésame.',
      safeNote: 'Saumon bien cuit — la marinade réduit à la cuisson.',
    },
  ],
];

// ─── T3 Recipes ───────────────────────────────────────────────────────────────
const T3_RECIPES: Recipe[][] = [
  // Rotation 0
  [
    {
      id: 't3-0-a',
      emoji: '🥣',
      title: 'Soupe de lentilles & chorizo doux',
      duration: '30 min',
      difficulty: 'Facile',
      nutrients: ['iron', 'fiber'],
      ingredients: ['200g lentilles vertes', '50g chorizo doux tranché', '1 carotte', '1 oignon', 'bouillon de volaille'],
      steps: 'Faites revenir oignon et chorizo. Ajoutez lentilles, carotte, bouillon. Cuire 25 min.',
      safeNote: 'Chorizo bien cuit (pas cru).',
    },
    {
      id: 't3-0-b',
      emoji: '🥩',
      title: 'Steak haché & purée d\'épinards',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['iron', 'vitaminK', 'calcium'],
      ingredients: ['2 steaks hachés', '300g épinards', '200g pommes de terre', '100ml lait', 'sel'],
      steps: 'Faites cuire les steaks bien à point. Réalisez une purée épinards-pommes de terre. Servez ensemble.',
      safeNote: 'Viande bien cuite (pas rosée).',
    },
    {
      id: 't3-0-c',
      emoji: '🌾',
      title: 'Crumble pomme-poire & avoine',
      duration: '35 min',
      difficulty: 'Facile',
      nutrients: ['fiber', 'iron'],
      ingredients: ['3 pommes', '2 poires', '100g flocons d\'avoine', '50g farine complète', '60g beurre', '40g sucre roux'],
      steps: 'Disposez les fruits coupés dans un plat. Mélangez avoine, farine, beurre, sucre. Étalez par-dessus. Four 30 min à 180°C.',
    },
  ],
  // Rotation 1
  [
    {
      id: 't3-1-a',
      emoji: '🫘',
      title: 'Chili sin carne express',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['iron', 'fiber', 'folate'],
      ingredients: ['400g haricots rouges', '400g tomates concassées', '1 poivron', '1 cc cumin', '1 cc paprika'],
      steps: 'Faites revenir oignon et poivron. Ajoutez épices, tomates, haricots. Mijotez 15 min.',
    },
    {
      id: 't3-1-b',
      emoji: '🥦',
      title: 'Quiche brocoli & emmental',
      duration: '40 min',
      difficulty: 'Moyen',
      nutrients: ['vitaminK', 'calcium', 'vitaminD'],
      ingredients: ['1 pâte brisée', '300g brocoli cuit', '100g emmental râpé', '3 œufs', '200ml crème légère'],
      steps: 'Étalez la pâte. Répartissez brocoli et fromage. Versez appareil œufs-crème. Four 30 min à 180°C.',
      safeNote: 'Quiche bien prise à cœur.',
    },
    {
      id: 't3-1-c',
      emoji: '🥛',
      title: 'Yaourt maison à la vanille',
      duration: '10 min + 8h repos',
      difficulty: 'Facile',
      nutrients: ['calcium', 'vitaminD'],
      ingredients: ['1L lait entier', '1 yaourt nature (ferment)', '1 gousse vanille'],
      steps: 'Chauffez le lait à 40°C. Ajoutez yaourt et vanille. Répartissez en pots. Laissez fermenter 8h au four éteint.',
    },
  ],
  // Rotation 2
  [
    {
      id: 't3-2-a',
      emoji: '🥩',
      title: 'Bœuf bourguignon simplifié',
      duration: '1h30',
      difficulty: 'Moyen',
      nutrients: ['iron', 'vitaminK'],
      ingredients: ['500g bœuf à braiser', '1 verre vin rouge', 'carottes', 'champignons', 'bouquet garni'],
      steps: 'Faites revenir le bœuf. Ajoutez légumes, vin, bouillon. Mijotez 1h à couvert.',
      safeNote: 'Viande bien cuite jusqu\'à 70°C minimum.',
    },
    {
      id: 't3-2-b',
      emoji: '🥬',
      title: 'Soupe de chou kale & pomme de terre',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['vitaminK', 'fiber', 'calcium'],
      ingredients: ['200g chou kale', '2 pommes de terre', '1 oignon', 'bouillon', 'noix de muscade'],
      steps: 'Faites revenir oignon. Ajoutez kale, pommes de terre, bouillon. Cuisez 20 min. Mixez partiellement.',
    },
    {
      id: 't3-2-c',
      emoji: '🌾',
      title: 'Pancakes avoine & banane',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['fiber', 'iron'],
      ingredients: ['150g flocons d\'avoine mixés', '2 bananes', '2 œufs', 'cannelle', 'miel'],
      steps: 'Mixez avoine, bananes et œufs. Faites des petites pancakes à la poêle 2 min/côté. Servez avec miel.',
    },
  ],
  // Rotation 3
  [
    {
      id: 't3-3-a',
      emoji: '🥗',
      title: 'Salade de quinoa au boudin noir',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['iron', 'fiber'],
      ingredients: ['150g quinoa cuit', '1 boudin noir (bien cuit)', 'pomme verte', 'persil', 'vinaigrette'],
      steps: 'Cuisez le boudin à la poêle. Émincez. Mélangez avec quinoa, pomme et persil. Assaisonnez.',
      safeNote: 'Boudin noir bien cuit.',
    },
    {
      id: 't3-3-b',
      emoji: '🥘',
      title: 'Lentilles beluga & légumes rôtis',
      duration: '35 min',
      difficulty: 'Facile',
      nutrients: ['iron', 'fiber', 'vitaminK'],
      ingredients: ['200g lentilles beluga', '1 betterave', '1 carotte', 'roquette', 'vinaigre balsamique'],
      steps: 'Rôtissez betterave et carotte 25 min. Cuisez lentilles 20 min. Assemblez avec roquette et balsamique.',
    },
    {
      id: 't3-3-c',
      emoji: '🫐',
      title: 'Porridge aux fruits & graines de chia',
      duration: '10 min',
      difficulty: 'Facile',
      nutrients: ['fiber', 'omega3', 'calcium'],
      ingredients: ['80g flocons d\'avoine', '2 cs graines de chia', '300ml lait', 'myrtilles', 'miel'],
      steps: 'Cuisez l\'avoine dans le lait. Ajoutez chia, laissez gonfler 5 min. Servez avec myrtilles.',
    },
  ],
];

// ─── Breastfeeding Recipes ────────────────────────────────────────────────────
const BF_RECIPES: Recipe[][] = [
  // Rotation 0
  [
    {
      id: 'bf-0-a',
      emoji: '🌊',
      title: 'Soupe de poisson & légumes',
      duration: '30 min',
      difficulty: 'Facile',
      nutrients: ['iodine', 'omega3', 'vitaminD'],
      ingredients: ['400g filets de cabillaud', '1 poireau', '2 carottes', 'bouillon de poisson', 'crème'],
      steps: 'Faites revenir poireau et carottes. Ajoutez bouillon et poisson. Cuisez 15 min. Ajoutez une touche de crème.',
      safeNote: 'Poisson bien cuit à cœur.',
    },
    {
      id: 'bf-0-b',
      emoji: '🥛',
      title: 'Velouté de brocoli au lait d\'amande',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'vitaminK'],
      ingredients: ['400g brocoli', '300ml lait d\'amande', '1 oignon', 'bouillon', 'amandes effilées'],
      steps: 'Cuisez brocoli et oignon dans le bouillon. Mixez avec le lait d\'amande. Garnissez d\'amandes.',
    },
    {
      id: 'bf-0-c',
      emoji: '🌰',
      title: 'Granola amandes & noix de cajou',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'omega3', 'iron'],
      ingredients: ['200g flocons d\'avoine', '50g amandes', '50g noix de cajou', '2 cs miel', '2 cs huile de coco'],
      steps: 'Mélangez tous les ingrédients. Étalez sur plaque. Four 20 min à 170°C. Remuez à mi-cuisson.',
    },
  ],
  // Rotation 1
  [
    {
      id: 'bf-1-a',
      emoji: '🐟',
      title: 'Sardines grillées & tabulé',
      duration: '20 min',
      difficulty: 'Facile',
      nutrients: ['omega3', 'calcium', 'iodine'],
      ingredients: ['4 sardines fraîches', '100g boulgour', 'persil', 'menthe', 'tomates', 'citron'],
      steps: 'Préparez le tabulé : boulgour cuit + herbes + tomates + citron. Grilllez les sardines 3 min/côté.',
      safeNote: 'Sardines bien cuites.',
    },
    {
      id: 'bf-1-b',
      emoji: '🫘',
      title: 'Dal de haricots blancs au lait de coco',
      duration: '25 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'iron', 'fiber'],
      ingredients: ['400g haricots blancs', '200ml lait de coco', '1 cc curry', '1 oignon', 'coriandre'],
      steps: 'Faites revenir oignon et curry. Ajoutez haricots et lait de coco. Mijotez 15 min. Garnissez coriandre.',
    },
    {
      id: 'bf-1-c',
      emoji: '🥛',
      title: 'Smoothie lacté : mangue-lait-chia',
      duration: '5 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'omega3', 'vitaminD'],
      ingredients: ['200ml lait', '1 mangue', '1 cs graines de chia', '1 cc miel'],
      steps: 'Mixez le lait avec la mangue. Versez dans un verre. Ajoutez les graines de chia. Mélangez et servez.',
    },
  ],
  // Rotation 2
  [
    {
      id: 'bf-2-a',
      emoji: '🧆',
      title: 'Falafels aux algues',
      duration: '30 min',
      difficulty: 'Moyen',
      nutrients: ['iodine', 'iron', 'calcium'],
      ingredients: ['400g pois chiches', '2 cs poudre d\'algues nori', '1 oignon', 'ail', 'persil', 'cumin'],
      steps: 'Mixez tous les ingrédients. Formez des boulettes. Faites frire ou four 25 min à 200°C.',
    },
    {
      id: 'bf-2-b',
      emoji: '🐟',
      title: 'Maquereau en escabèche',
      duration: '20 min + 2h marinade',
      difficulty: 'Moyen',
      nutrients: ['omega3', 'vitaminD', 'iodine'],
      ingredients: ['4 filets maquereau', '200ml vinaigre blanc', '1 oignon', 'laurier', 'poivre'],
      steps: 'Cuisez les filets à la poêle. Préparez la marinade chaude. Versez sur le poisson. Laissez 2h.',
      safeNote: 'Maquereau bien cuit avant marinade.',
    },
    {
      id: 'bf-2-c',
      emoji: '🥗',
      title: 'Salade de haricots verts & noix',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'omega3', 'vitaminK'],
      ingredients: ['300g haricots verts', '50g noix', '1 cs huile de noix', 'vinaigre de cidre', 'sel'],
      steps: 'Cuisez les haricots al dente. Refroidissez. Mélangez avec noix et assaisonnement à l\'huile de noix.',
    },
  ],
  // Rotation 3
  [
    {
      id: 'bf-3-a',
      emoji: '🥣',
      title: 'Overnight oats iodés',
      duration: '5 min + une nuit',
      difficulty: 'Facile',
      nutrients: ['calcium', 'omega3', 'iodine'],
      ingredients: ['80g flocons d\'avoine', '200ml lait', '2 cs graines de chia', 'kiwi', '1 cs spiruline optionnel'],
      steps: 'Mélangez avoine, lait, chia dans un pot. Réfrigérez une nuit. Le matin, garnissez de kiwi.',
    },
    {
      id: 'bf-3-b',
      emoji: '🫙',
      title: 'Hummus maison enrichi',
      duration: '10 min',
      difficulty: 'Facile',
      nutrients: ['calcium', 'iron', 'fiber'],
      ingredients: ['400g pois chiches', '2 cs tahini', '1 citron', 'ail', 'huile d\'olive', 'paprika'],
      steps: 'Mixez tous les ingrédients jusqu\'à consistance crémeuse. Ajoutez de l\'eau si nécessaire. Servez avec légumes ou pain pita.',
    },
    {
      id: 'bf-3-c',
      emoji: '🐚',
      title: 'Crevettes sautées au gingembre',
      duration: '15 min',
      difficulty: 'Facile',
      nutrients: ['iodine', 'iron', 'omega3'],
      ingredients: ['300g crevettes cuites', '1 cs gingembre frais râpé', '2 cs sauce soja', '1 cs huile sésame', 'riz'],
      steps: 'Faites chauffer l\'huile. Ajoutez gingembre, puis crevettes. Arrosez de sauce soja. Servez sur riz.',
      safeNote: 'Crevettes déjà cuites, réchauffez bien.',
    },
  ],
];

// ─── Public accessor ──────────────────────────────────────────────────────────
export function getRecipesForPhase(phase: string, rotation?: number): Recipe[] {
  const r = rotation !== undefined ? rotation : getWeekRotation();
  const idx = r % 4;
  switch (phase) {
    case '1': return T1_RECIPES[idx] ?? T1_RECIPES[0];
    case '2': return T2_RECIPES[idx] ?? T2_RECIPES[0];
    case '3': return T3_RECIPES[idx] ?? T3_RECIPES[0];
    case 'breastfeeding': return BF_RECIPES[idx] ?? BF_RECIPES[0];
    default: return [];
  }
}
