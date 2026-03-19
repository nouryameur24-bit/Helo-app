import type { Trimester } from '@/types';

export interface WeeklyTip {
  week: number;
  trimester: Trimester;
  title: string;
  body: string;
  source: string;
}

export const WEEKLY_TIPS: WeeklyTip[] = [
  // ─── TRIMESTRE 1 (semaines 1-13) ──────────────────────────────────────────
  {
    week: 1,
    trimester: 1,
    title: 'Acide folique — commencez maintenant',
    body: "La supplémentation en acide folique (vitamine B9) dès avant la conception et pendant les 12 premières semaines réduit le risque de spina bifida de 70 %. La dose recommandée est de 400 µg/jour pour toutes les femmes, et 5 mg/jour en cas d'antécédents.",
    source: 'HAS, ANSM',
  },
  {
    week: 2,
    trimester: 1,
    title: 'Évitez l\'alcool dès le premier jour',
    body: "Il n'existe aucun seuil d'alcool sûr pendant la grossesse. L'alcool traverse le placenta et peut provoquer des troubles du spectre de l'alcoolisation fœtale (TSAF). Arrêtez dès que vous envisagez une grossesse.",
    source: 'OMS, Santé Publique France',
  },
  {
    week: 3,
    trimester: 1,
    title: 'Listériose — les aliments à éviter',
    body: "Évitez les fromages à pâte molle (camembert, brie au lait cru), les charcuteries tranchées, les poissons fumés et les graines germées. Préférez les fromages à pâte cuite (emmental, comté) et les produits bien cuits.",
    source: 'ANSM, ANSES',
  },
  {
    week: 4,
    trimester: 1,
    title: 'Toxoplasmose — sécurité alimentaire',
    body: "Si vous n'êtes pas immunisée, évitez la viande crue ou peu cuite, les crudités mal lavées et le contact avec la litière de chat. Lavez soigneusement les légumes et fruits. Le dépistage mensuel est recommandé.",
    source: 'CRAT, INRS',
  },
  {
    week: 5,
    trimester: 1,
    title: 'Nausées matinales — comment les gérer',
    body: "Les nausées touchent 70 à 80 % des femmes enceintes. Mangez en petites quantités fréquentes, évitez les odeurs fortes, préférez les aliments froids (moins odorants). Le gingembre à faible dose peut aider. En cas de vomissements sévères, consultez.",
    source: 'HAS, CNGOF',
  },
  {
    week: 6,
    trimester: 1,
    title: 'Cosmétiques — les ingrédients à bannir',
    body: "Évitez les produits contenant du rétinol, des rétinoïdes, de l'hydroquinone, des phtalates et du formaldéhyde. Préférez les formules certifiées « grossesse safe » et lisez systématiquement les étiquettes. Hēlo vous aide à les scanner.",
    source: 'ANSM, Commission Européenne',
  },
  {
    week: 7,
    trimester: 1,
    title: 'Caféine — limitez votre consommation',
    body: "L'OMS recommande de ne pas dépasser 200 mg de caféine par jour (environ 2 expressos). La caféine traverse le placenta et peut affecter le rythme cardiaque fœtal. Comptez aussi la caféine du thé, du chocolat et des sodas.",
    source: 'OMS, EFSA',
  },
  {
    week: 8,
    trimester: 1,
    title: 'Médicaments — demandez toujours un avis médical',
    body: "Ne prenez jamais de médicament sans avis médical, même en vente libre. L'ibuprofène, l'aspirine à forte dose et de nombreux anti-douleurs sont contre-indiqués. Le paracétamol peut être utilisé ponctuellement à la dose minimale efficace.",
    source: 'CRAT, ANSM',
  },
  {
    week: 9,
    trimester: 1,
    title: 'Activité physique douce',
    body: "La marche, la natation et le yoga prénatal sont recommandés. Visez 30 minutes d'activité modérée par jour. Évitez les sports de contact, les activités à risque de chute et la plongée sous-marine. Adaptez l'intensité à votre ressenti.",
    source: 'CNGOF, OMS',
  },
  {
    week: 10,
    trimester: 1,
    title: 'Fer et anémie — surveillez votre alimentation',
    body: "Les besoins en fer doublent pendant la grossesse. Privilégiez les viandes rouges bien cuites, les légumineuses, les épinards et les céréales enrichies. La vitamine C améliore l'absorption du fer végétal. Un bilan sanguin à 28 SA est recommandé.",
    source: 'HAS, CNGOF',
  },
  {
    week: 11,
    trimester: 1,
    title: 'Sommeil — premières difficultés',
    body: "Les difficultés à trouver le sommeil débutent souvent au T1. Évitez les écrans 1h avant de dormir, pratiquez une routine relaxante. Dormez sur le côté gauche pour améliorer la circulation. Évitez la mélatonine sans avis médical.",
    source: 'ANSM, HAS',
  },
  {
    week: 12,
    trimester: 1,
    title: 'Première échographie — ce à quoi s\'attendre',
    body: "L'échographie du premier trimestre (11 SA - 13 SA + 6 jours) évalue la clarté nucale, confirme le terme et dépiste certaines anomalies chromosomiques. C'est aussi la première image de votre bébé. Préparez vos questions pour votre médecin.",
    source: 'HAS, CNGOF',
  },
  {
    week: 13,
    trimester: 1,
    title: 'Fin du T1 — votre corps change',
    body: "À 13 SA, le placenta assure désormais la majorité des fonctions hormonales. Les nausées s'atténuent souvent. Votre utérus commence à être perceptible. C'est le moment idéal pour annoncer votre grossesse si ce n'est pas déjà fait.",
    source: 'CNGOF',
  },

  // ─── TRIMESTRE 2 (semaines 14-26) ─────────────────────────────────────────
  {
    week: 14,
    trimester: 2,
    title: 'Bienvenue au deuxième trimestre',
    body: "Le T2 est souvent appelé « la belle période » de la grossesse. Les nausées disparaissent généralement, l'énergie revient. C'est le bon moment pour pratiquer une activité physique régulière et préparer votre environnement.",
    source: 'CNGOF',
  },
  {
    week: 15,
    trimester: 2,
    title: 'Calcium — besoins accrus',
    body: "Les besoins en calcium passent à 1 000 mg/jour. Le lait, les yaourts, le fromage à pâte cuite, les sardines et les amandes sont de bonnes sources. Une carence peut affecter la minéralisation osseuse de votre bébé.",
    source: 'EFSA, HAS',
  },
  {
    week: 16,
    trimester: 2,
    title: 'Huiles essentielles — prudence absolue',
    body: "La majorité des huiles essentielles sont contre-indiquées pendant la grossesse (effets utérotoniques, neurotoxiques). Évitez les produits de massage, bougies et diffuseurs contenant de l'eucalyptus, menthe poivrée, sauge, thym et lavande à haute dose.",
    source: 'ANSM, ANSES',
  },
  {
    week: 17,
    trimester: 2,
    title: 'Premiers mouvements fœtaux',
    body: "Vers 16-20 SA, vous pouvez ressentir les premiers mouvements de votre bébé. D'abord comme des bulles ou des battements d'ailes. En cas d'arrêt brutal des mouvements après 28 SA, consultez en urgence.",
    source: 'CNGOF',
  },
  {
    week: 18,
    trimester: 2,
    title: 'Oméga-3 — essentiels pour le cerveau fœtal',
    body: "Les acides gras oméga-3 (DHA en particulier) sont cruciaux pour le développement cérébral et rétinien du fœtus. Consommez 2 fois par semaine des poissons gras (maquereau, sardine, hareng). Évitez les gros poissons (thon, espadon) qui concentrent les métaux lourds.",
    source: 'EFSA, ANSES',
  },
  {
    week: 19,
    trimester: 2,
    title: 'Prévenir les vergetures',
    body: "Les vergetures apparaissent souvent entre 20 et 30 SA. Hydratez votre peau quotidiennement avec des huiles végétales (argan, rosier muscat, amande douce) — préférez les produits sans huiles essentielles ni rétinol. L'hydratation interne est tout aussi importante.",
    source: 'Dermatologie, ANSM',
  },
  {
    week: 20,
    trimester: 2,
    title: 'Deuxième échographie morphologique',
    body: "L'échographie du 2e trimestre (22 SA) est la plus complète. Elle examine en détail les organes, mesure le fœtus, vérifie le placenta et le liquide amniotique. Prévoyez 30 à 45 minutes et posez toutes vos questions.",
    source: 'HAS, CNGOF',
  },
  {
    week: 21,
    trimester: 2,
    title: 'Reflux gastro-œsophagien',
    body: "Les brûlures d'estomac touchent 30 à 50 % des femmes enceintes au T2. Mangez lentement, évitez les repas copieux le soir, restez debout 30 minutes après les repas. Les antiacides à base de carbonate de calcium ou hydroxyde de magnésium sont sûrs.",
    source: 'CRAT, HAS',
  },
  {
    week: 22,
    trimester: 2,
    title: 'Diabète gestationnel — dépistage',
    body: "Le dépistage du diabète gestationnel est recommandé entre 24 et 28 SA pour les femmes à risque. Un diabète non contrôlé augmente le risque de macrosomie, de complications à l'accouchement et de diabète de type 2 plus tard.",
    source: 'HAS, SFD',
  },
  {
    week: 23,
    trimester: 2,
    title: 'Parabènes — limiter l\'exposition',
    body: "Les parabènes (methylparaben, propylparaben, butylparaben) sont des conservateurs aux propriétés œstrogéno-mimétiques. Préférez les produits sans parabènes, notamment pour les crèmes appliquées sur de grandes surfaces de peau.",
    source: 'ANSM, ANSES',
  },
  {
    week: 24,
    trimester: 2,
    title: 'Hypertension artérielle et pré-éclampsie',
    body: "La pré-éclampsie touche 2 à 8 % des grossesses. Signes d'alerte : maux de tête intenses, vision trouble, œdèmes soudains des mains et du visage, douleur en barre sous les côtes. Consultez en urgence si vous présentez ces symptômes.",
    source: 'CNGOF, HAS',
  },
  {
    week: 25,
    trimester: 2,
    title: 'Préparation à la naissance',
    body: "Les séances de préparation à l'accouchement (8 séances remboursées) peuvent débuter dès 28 SA. Sophrologie, haptonomie, yoga prénatal — choisissez la méthode qui vous correspond. Impliquez votre partenaire si possible.",
    source: 'HAS, Assurance Maladie',
  },
  {
    week: 26,
    trimester: 2,
    title: 'Fin du T2 — bilan nutritionnel',
    body: "Faites le point sur votre alimentation : diversité, apports en protéines, fer, calcium, oméga-3. Si votre alimentation est déséquilibrée, discutez d'une supplémentation avec votre médecin. Évitez les régimes restrictifs.",
    source: 'HAS, CNGOF',
  },

  // ─── TRIMESTRE 3 (semaines 27-40) ─────────────────────────────────────────
  {
    week: 27,
    trimester: 3,
    title: 'Entrée dans le troisième trimestre',
    body: "Le T3 marque l'accélération de la croissance fœtale. Votre bébé prend environ 200 g par semaine. Les besoins en protéines et en énergie augmentent. Continuez à manger équilibré et à rester active selon votre confort.",
    source: 'CNGOF',
  },
  {
    week: 28,
    trimester: 3,
    title: 'Mouvements fœtaux — surveillance quotidienne',
    body: "Dès 28 SA, comptez les mouvements de votre bébé quotidiennement. Un bon repère : 10 mouvements en 2 heures. En cas de diminution significative ou d'arrêt, appelez immédiatement votre maternité sans attendre le lendemain.",
    source: 'CNGOF, HAS',
  },
  {
    week: 29,
    trimester: 3,
    title: 'AINS et anti-douleurs — danger au T3',
    body: "L'ibuprofène, le naproxène et tous les AINS sont formellement contre-indiqués à partir de 24 SA. Ils peuvent provoquer une fermeture prématurée du canal artériel et une insuffisance rénale néonatale. Seul le paracétamol à dose minimale est accepté.",
    source: 'CRAT, ANSM',
  },
  {
    week: 30,
    trimester: 3,
    title: 'Troisième échographie',
    body: "L'échographie du 3e trimestre (32 SA) vérifie la croissance fœtale, la position du bébé, la quantité de liquide amniotique et l'insertion placentaire. En cas de siège, votre équipe médicale discutera des options d'accouchement.",
    source: 'HAS, CNGOF',
  },
  {
    week: 31,
    trimester: 3,
    title: 'Préparation du trousseau — sans perturbateurs endocriniens',
    body: "Lors de l'achat de produits bébé, évitez les plastiques contenant des phtalates et BPA (privilégiez le verre ou l'inox). Pour les cosmétiques bébé, choisissez des formules courtes sans parfum synthétique ni conservateurs agressifs.",
    source: 'ANSES, 60 Millions de Consommateurs',
  },
  {
    week: 32,
    trimester: 3,
    title: 'Congé maternité — vos droits',
    body: "En France, le congé prénatal débute 6 semaines avant la date prévue d'accouchement (pour un premier enfant). Pour un troisième enfant, il est de 8 semaines. N'oubliez pas de prévenir votre employeur et la CPAM.",
    source: 'Assurance Maladie, Service-public.fr',
  },
  {
    week: 33,
    trimester: 3,
    title: 'Épine dorsale et douleurs lombaires',
    body: "70 % des femmes souffrent de lombalgies au T3. Évitez les positions assises prolongées, dormez avec un coussin entre les genoux, pratiquez des exercices de renforcement du périnée et des abdominaux profonds. La ceinture de grossesse peut aider.",
    source: 'CNGOF, HAS',
  },
  {
    week: 34,
    trimester: 3,
    title: 'Plan de naissance — exprimez vos souhaits',
    body: "Un plan de naissance est un document résumant vos souhaits pour l'accouchement (péridurale, peau à peau, gestion de la douleur, présence du partenaire). Rédigez-le avec votre sage-femme et remettez-le à la maternité.",
    source: 'HAS, CNGOF',
  },
  {
    week: 35,
    trimester: 3,
    title: 'Allaitement — se préparer',
    body: "Si vous envisagez d'allaiter, informez-vous sur la mise au sein, les positions, les signes de bonne prise du sein. Des consultations avec une consultante en lactation certifiée IBCLC peuvent être prises avant la naissance pour éviter les difficultés.",
    source: 'HAS, Leche League France',
  },
  {
    week: 36,
    trimester: 3,
    title: 'Streptocoque B — dépistage systématique',
    body: "Le dépistage du streptocoque du groupe B est réalisé entre 35 et 38 SA. En cas de résultat positif, une antibioprophylaxie sera administrée pendant l'accouchement pour protéger votre bébé. Ce n'est pas une urgence — c'est un suivi standard.",
    source: 'CNGOF, HAS',
  },
  {
    week: 37,
    trimester: 3,
    title: 'Prématurité tardive vs terme',
    body: "À 37 SA, votre bébé est considéré « à terme ». Cependant, les bébés nés entre 37 et 38 SA + 6 jours (terme tardif) peuvent présenter plus de difficultés d'adaptation. L'accouchement provoqué avant 39 SA n'est recommandé que si médicalement nécessaire.",
    source: 'CNGOF, HAS',
  },
  {
    week: 38,
    trimester: 3,
    title: 'Les signes du travail',
    body: "Signes à surveiller : contractions régulières et rapprochées, perte du bouchon muqueux, rupture de la poche des eaux (liquide clair ou teinté). En cas de liquide verdâtre, de saignements abondants ou de mouvements fœtaux diminués, allez directement à la maternité.",
    source: 'CNGOF, HAS',
  },
  {
    week: 39,
    trimester: 3,
    title: 'Le terme approche — restez calme',
    body: "L'accouchement peut survenir entre 39 et 41 SA. Préparez votre sac de maternité (documents, vêtements, produits de soin), notez les numéros d'urgence. Une grossesse prolongée au-delà de 41 SA nécessite une surveillance renforcée.",
    source: 'CNGOF, Maternité',
  },
  {
    week: 40,
    trimester: 3,
    title: 'Dépassement de terme',
    body: "Si vous dépassez 41 SA, un déclenchement peut être proposé. Des examens de surveillance fœtale (monitoring, échographie) sont réalisés. Discutez des options avec votre équipe médicale. La décision est prise ensemble, selon l'état de votre bébé et du col.",
    source: 'CNGOF, HAS',
  },
];

export function getTipForWeek(week: number): WeeklyTip {
  const clamped = Math.max(1, Math.min(40, week));
  return WEEKLY_TIPS[clamped - 1];
}
