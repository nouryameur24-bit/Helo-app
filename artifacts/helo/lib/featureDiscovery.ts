// ─── Feature Discovery — registry of first-use bottom sheets ─────────────────
//
// Each entry = the content of a discovery sheet shown the FIRST time a user
// opens a mode. AsyncStorage flag `@helo_discovery_<key>` ensures it only
// ever appears once. See `components/ui/FeatureDiscoverySheet.tsx` and
// `hooks/useFeatureDiscovery.ts` for the rendering + control surface.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiscoveryKey =
  // Scanner modes
  | 'barcode'
  | 'ocr'
  | 'photo'
  | 'voice'
  | 'basket'
  | 'shelf'
  | 'prescription'
  // Features
  | 'restaurant'
  | 'chat'
  | 'partner'
  | 'circle'
  | 'pact'
  | 'ar_mirror'
  | 'travel'
  | 'nutrition'
  | 'memories'
  | 'journal'
  | 'timeline';

export type DiscoveryContent = {
  icon: string;
  title: string;
  description: string;
  tip: string;
};

export const DISCOVERIES: Record<DiscoveryKey, DiscoveryContent> = {
  // ── Scanner modes ──────────────────────────────────────────────────────────
  barcode: {
    icon: '📱',
    title: 'Scanner un code-barres',
    description:
      "Pointez votre caméra vers le code-barres du produit. L'analyse est instantanée parmi nos 12 118 produits référencés.",
    tip: "💡 Astuce : si le code-barres n'est pas trouvé, essayez le mode Photo",
  },
  ocr: {
    icon: '📋',
    title: 'Photographier les ingrédients',
    description:
      "Prenez en photo la liste d'ingrédients au dos du produit. Notre IA analyse chaque composant contre 4 962 ingrédients référencés.",
    tip: '💡 Idéal pour les produits sans code-barres ou importés',
  },
  photo: {
    icon: '📸',
    title: 'Identifier par photo',
    description:
      "Prenez le produit en photo. Notre IA reconnaît le produit visuellement et estime sa composition pour vous donner une analyse.",
    tip: "💡 Pratique quand le code-barres est abîmé ou absent",
  },
  voice: {
    icon: '🎤',
    title: 'Recherche vocale',
    description:
      "Dites le nom d'un produit ou d'un ingrédient. Hēlo cherche dans sa base et vous donne l'analyse.",
    tip: '💡 Les mains prises ? Demandez simplement à voix haute',
  },
  basket: {
    icon: '🛒',
    title: 'Scanner votre panier',
    description:
      "Scannez plusieurs produits à la suite sans quitter le mode caméra. Parfait pour vérifier vos courses d'un coup.",
    tip: "💡 Les résultats s'empilent — consultez-les à la fin",
  },
  shelf: {
    icon: '🗄️',
    title: 'Analyser une étagère',
    description:
      'Prenez en photo votre étagère de salle de bain ou votre placard. Hēlo détecte et analyse chaque produit visible.',
    tip: '💡 Idéal pour faire le tri dans vos produits existants',
  },
  prescription: {
    icon: '💊',
    title: 'Vérifier une ordonnance',
    description:
      'Photographiez votre ordonnance. Hēlo identifie chaque médicament prescrit et vérifie sa compatibilité avec votre trimestre.',
    tip: '⚠️ Ne modifiez jamais un traitement sans avis de votre médecin',
  },

  // ── Features ───────────────────────────────────────────────────────────────
  restaurant: {
    icon: '🍽️',
    title: 'Le Mode Restaurant',
    description:
      'Photographiez le menu du restaurant. Hēlo analyse chaque plat et vous dit ce que vous pouvez commander sereinement.',
    tip: '💡 Hēlo génère aussi les questions à poser au serveur',
  },
  chat: {
    icon: '💬',
    title: 'Votre Sage-Femme IA',
    description:
      "Posez n'importe quelle question sur votre grossesse. Les réponses sont adaptées à votre trimestre et sourcées médicalement.",
    tip: '💡 Cet outil ne remplace pas votre médecin — il vous informe',
  },
  partner: {
    icon: '💙',
    title: 'Le Mode Partenaire',
    description:
      'Votre partenaire scanne les produits au supermarché pendant que vous, vous suivez tout depuis votre canapé. Placard partagé en temps réel.',
    tip: '💡 Partagez votre code partenaire depuis votre profil',
  },
  circle: {
    icon: '👩\u200d👩\u200d👧',
    title: 'Mon Cercle',
    description:
      'Créez votre groupe privé avec vos amies enceintes. Partagez vos découvertes produits et vos conseils.',
    tip: '💡 Invitez vos amies via un simple lien',
  },
  pact: {
    icon: '🔥',
    title: 'Le Pacte Hēlo',
    description:
      "Engagez-vous à scanner au moins 1 produit par jour pendant 7, 14 ou 30 jours. Vos témoins vous encouragent.",
    tip: '💡 Complétez le pacte de 30 jours pour un badge exclusif',
  },
  ar_mirror: {
    icon: '✨',
    title: 'Le Miroir AR',
    description:
      'Pointez votre caméra vers vos produits. Un halo vert, orange ou rouge apparaît en direct sur chaque produit reconnu.',
    tip: "💡 Idéal pour trier votre salle de bain en un clin d'œil",
  },
  travel: {
    icon: '✈️',
    title: 'Mode Voyage',
    description:
      'Sélectionnez votre destination. Hēlo vous briefe sur les précautions alimentaires, les médicaments et les vaccins.',
    tip: '💡 Téléchargez le briefing en offline avant de partir',
  },
  nutrition: {
    icon: '🥗',
    title: 'Votre Nutritionniste IA',
    description:
      'Découvrez vos besoins nutritionnels semaine par semaine et des recettes adaptées à votre trimestre.',
    tip: '💡 Les recettes tiennent compte des aliments à éviter',
  },
  memories: {
    icon: '💌',
    title: 'Capsules Temporelles',
    description:
      "Écrivez un message ou enregistrez une vidéo pour votre bébé. Il les découvrira à l'âge que vous choisissez.",
    tip: '💡 Un message par trimestre, c’est 3 souvenirs pour la vie',
  },
  journal: {
    icon: '📔',
    title: 'Votre Journal',
    description:
      'Notez vos symptômes, votre humeur, vos moments forts. Votre grossesse mérite d’être documentée.',
    tip: '💡 Ajoutez des photos pour un souvenir complet',
  },
  timeline: {
    icon: '📅',
    title: 'Timeline 40 semaines',
    description:
      'Suivez le développement de votre bébé semaine après semaine. Taille, poids, organes en formation, conseils adaptés.',
    tip: '💡 Chaque semaine apporte de nouvelles informations',
  },
};

const storageKey = (key: DiscoveryKey) => `@helo_discovery_${key}`;

export async function hasSeenDiscovery(key: DiscoveryKey): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(storageKey(key));
    return v === '1';
  } catch {
    return false;
  }
}

export async function markDiscoverySeen(key: DiscoveryKey): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(key), '1');
  } catch {
    // best-effort
  }
}

export async function resetDiscovery(key: DiscoveryKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(key));
  } catch {
    // best-effort
  }
}
