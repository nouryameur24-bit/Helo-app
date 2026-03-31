export interface PartnerTip {
  week: number;
  title: string;
  body: string;
  mission: string;
}

export const PARTNER_TIPS: PartnerTip[] = [
  {
    week: 1,
    title: 'Le voyage commence',
    body: "La grossesse débute ! Votre partenaire vit une transformation hormonale intense, même si rien n'est encore visible. Soyez attentif à ses humeurs et à ses besoins. C'est le bon moment pour prendre de bonnes habitudes communes.",
    mission: 'Prenez rendez-vous ensemble chez le médecin pour la confirmation de grossesse.',
  },
  {
    week: 2,
    title: 'L\'acide folique, votre allié',
    body: "La vitamine B9 est cruciale ces premières semaines pour éviter les malformations du tube neural. Si votre partenaire n'a pas encore commencé une supplémentation, encouragez-la à en parler à son médecin dès aujourd'hui.",
    mission: 'Vérifiez ensemble que la supplémentation en acide folique est bien en place.',
  },
  {
    week: 3,
    title: 'Alcool : tolérance zéro',
    body: "Il n'existe aucune dose d'alcool sans risque pendant la grossesse. Montrez l'exemple en réduisant vous aussi votre consommation. Votre solidarité sera précieuse et encourageante pour votre partenaire.",
    mission: 'Proposez des alternatives sans alcool pour vos prochaines sorties ou soirées.',
  },
  {
    week: 4,
    title: 'La fatigue s\'installe',
    body: "La fatigue est l'un des premiers signes de grossesse. La progestérone monte en flèche et épuise votre partenaire. Ce n'est pas dans sa tête : son corps travaille dur pour créer le placenta. Laissez-la se reposer sans culpabilité.",
    mission: 'Prenez en charge les tâches ménagères ce soir pour qu\'elle puisse se reposer.',
  },
  {
    week: 5,
    title: 'Les nausées arrivent',
    body: "70 à 80 % des femmes enceintes souffrent de nausées au premier trimestre, surtout entre les semaines 6 et 12. Elles peuvent survenir à toute heure, pas seulement le matin. Le gingembre, les repas fractionnés et l'air frais peuvent aider.",
    mission: 'Préparez un kit anti-nausées : biscuits secs, infusion gingembre, eau fraîche.',
  },
  {
    week: 6,
    title: 'Cosmétiques : scrutez les étiquettes',
    body: "Certains ingrédients cosmétiques (rétinol, phtalates, formaldéhyde, hydroquinone) sont contre-indiqués pendant la grossesse. L'application Hēlo permet de scanner les produits du placard. Aidez votre partenaire à identifier les produits à risque.",
    mission: 'Scannez ensemble 3 produits du placard de la salle de bain avec Hēlo.',
  },
  {
    week: 7,
    title: 'Le cœur du bébé bat déjà',
    body: "Dès la 6e semaine, le cœur du bébé commence à battre — environ 150 pulsations par minute. Votre partenaire vit un moment intense, mêlé d'émerveillement et d'anxiété. Votre présence et votre enthousiasme comptent énormément.",
    mission: 'Écoutez votre partenaire parler de ses ressentis sans minimiser ses émotions.',
  },
  {
    week: 8,
    title: 'Les médicaments sont à vérifier',
    body: "Même les médicaments en vente libre peuvent être dangereux pendant la grossesse. L'ibuprofène, l'aspirine et de nombreux anti-douleurs sont contre-indiqués. Seul le paracétamol est généralement accepté, à la dose minimale. Vérifiez toujours avec un médecin.",
    mission: 'Faites le tri dans la pharmacie familiale et retirez les médicaments contre-indiqués.',
  },
  {
    week: 9,
    title: 'Soutenir sans envahir',
    body: "Votre partenaire a besoin de votre soutien, mais aussi de son espace. Demandez-lui régulièrement comment elle se sent et ce dont elle a besoin, plutôt que d'anticiper à sa place. L'écoute active est votre super-pouvoir du moment.",
    mission: 'Planifiez un moment de 15 minutes sans téléphone pour l\'écouter vraiment.',
  },
  {
    week: 10,
    title: 'La première échographie approche',
    body: "L'échographie du premier trimestre a lieu entre 11 et 14 SA. C'est souvent le premier contact visuel avec le bébé. Organisez votre agenda pour y être présent. Ce moment fort reste gravé dans les mémoires.",
    mission: 'Bloquez la date de l\'échographie dans votre agenda et prenez vos dispositions.',
  },
  {
    week: 11,
    title: 'Alimentation : les aliments à éviter',
    body: "La listériose et la toxoplasmose sont des risques alimentaires sérieux. Évitez de proposer à votre partenaire : fromages à pâte molle au lait cru, charcuteries tranchées, poissons crus, viandes peu cuites et crudités mal lavées.",
    mission: 'Révisez ensemble la liste des aliments à éviter et adaptez vos menus de la semaine.',
  },
  {
    week: 12,
    title: 'L\'échographie morphologique du T1',
    body: "L'échographie du premier trimestre examine la clarté nucale et dépiste certaines anomalies chromosomiques. Les résultats peuvent provoquer de l'anxiété. Préparez-vous à accueillir les émotions de votre partenaire avec calme et bienveillance.",
    mission: 'Accompagnez votre partenaire à l\'échographie et éteignez votre téléphone pendant l\'examen.',
  },
  {
    week: 13,
    title: 'Fin du premier trimestre',
    body: "Le risque de fausse couche diminue fortement après 12 SA. Votre partenaire entre dans une période souvent plus sereine. Les nausées s'estompent, l'énergie revient. C'est le bon moment pour partager la nouvelle et commencer à préparer l'arrivée du bébé.",
    mission: 'Célébrez ensemble cette étape importante : un dîner, une balade, un moment rien que pour vous.',
  },
  {
    week: 14,
    title: 'Le ventre commence à s\'arrondir',
    body: "Au deuxième trimestre, le ventre devient plus visible et votre partenaire ressent davantage les changements de son corps. Elle peut avoir une image d'elle-même altérée. Des compliments sincères et bienveillants font toute la différence.",
    mission: 'Dites-lui sincèrement ce que vous admirez chez elle en ce moment.',
  },
  {
    week: 15,
    title: 'Calcium et nutrition',
    body: "Les besoins en calcium augmentent pendant la grossesse. Le lait, les yaourts, les fromages à pâte cuite (emmental, comté), les sardines et les amandes sont d'excellentes sources. Aidez votre partenaire à varier son alimentation.",
    mission: 'Préparez un repas riche en calcium cette semaine : lasagnes, gratin ou salade de sardines.',
  },
  {
    week: 16,
    title: 'Huiles essentielles : la vigilance s\'impose',
    body: "La plupart des huiles essentielles sont contre-indiquées pendant la grossesse (eucalyptus, menthe poivrée, sauge, thym). Évitez les diffuseurs, bougies parfumées et massages à base d'huiles essentielles non validées par un professionnel de santé.",
    mission: 'Vérifiez et retirez les produits à base d\'huiles essentielles contre-indiquées de la maison.',
  },
  {
    week: 17,
    title: 'Les premiers mouvements fœtaux',
    body: "Entre 16 et 20 SA, votre partenaire peut commencer à ressentir les mouvements du bébé, d'abord comme des bulles ou un frémissement. C'est une expérience intime et émouvante. Montrez-vous attentif et intéressé sans la brusquer.",
    mission: 'Demandez-lui de vous décrire ce qu\'elle ressent quand le bébé bouge.',
  },
  {
    week: 18,
    title: 'Oméga-3 pour le cerveau du bébé',
    body: "Le DHA (acide gras oméga-3) est essentiel pour le développement cérébral et rétinien du bébé. Encouragez votre partenaire à manger 2 fois par semaine des poissons gras (maquereau, sardine, hareng) — en évitant les gros poissons riches en métaux lourds.",
    mission: 'Cuisinez ensemble un repas à base de poissons gras : sardines fraîches, filet de maquereau...',
  },
  {
    week: 19,
    title: 'Hydratation et soin de la peau',
    body: "Les vergetures apparaissent souvent entre 20 et 30 SA. Des huiles végétales sans huiles essentielles (argan, amande douce, rosier muscat) appliquées quotidiennement peuvent aider. Hēlo peut vous aider à choisir des produits sûrs.",
    mission: 'Scannez les huiles et crèmes hydratantes de la salle de bain pour vérifier leur sécurité.',
  },
  {
    week: 20,
    title: 'L\'échographie morphologique du T2',
    body: "L'échographie du 2e trimestre (vers 22 SA) est la plus détaillée : elle examine en profondeur tous les organes du bébé. C'est souvent là que l'on peut découvrir le sexe. Préparez vos questions et bloquez votre agenda.",
    mission: 'Préparez ensemble une liste de questions à poser lors de l\'échographie morphologique.',
  },
  {
    week: 21,
    title: 'Reflux et digestion difficile',
    body: "Les brûlures d'estomac et reflux touchent 30 à 50 % des femmes enceintes au T2. Des repas fractionnés, rester debout 30 minutes après manger et éviter les aliments acides et épicés peuvent aider. Adaptez vos menus communs en conséquence.",
    mission: 'Proposez des repas légers et en petites portions ce soir.',
  },
  {
    week: 22,
    title: 'Diabète gestationnel — le dépistage approche',
    body: "Le dépistage du diabète gestationnel est recommandé entre 24 et 28 SA pour les femmes à risque. Un diabète gestationnel non contrôlé peut avoir des conséquences sur la croissance du bébé. Encouragez votre partenaire à faire le test.",
    mission: 'Vérifiez ensemble que le rendez-vous de dépistage est bien planifié.',
  },
  {
    week: 23,
    title: 'Parabènes et perturbateurs endocriniens',
    body: "Les parabènes présents dans de nombreux cosmétiques ont des propriétés hormonales. Préférez des produits sans parabènes, particulièrement pour les crèmes corporelles appliquées sur de grandes surfaces. Hēlo analyse les ingrédients pour vous.",
    mission: 'Scannez la crème corporelle de votre partenaire avec Hēlo pour vérifier sa sécurité.',
  },
  {
    week: 24,
    title: 'Hypertension : les signes à surveiller',
    body: "La pré-éclampsie touche 2 à 8 % des grossesses. Apprenez à reconnaître les signes d'alarme : maux de tête intenses, vision trouble, œdèmes soudains des mains et du visage, douleur en barre sous les côtes. En cas de doute, consultez sans attendre.",
    mission: 'Mémorisez les signes d\'alerte de la pré-éclampsie et notez le numéro de la maternité.',
  },
  {
    week: 25,
    title: 'Préparer la naissance ensemble',
    body: "Les cours de préparation à l'accouchement (8 séances remboursées) peuvent commencer dès maintenant. Sophrologie, haptonomie, yoga prénatal : choisissez ensemble la méthode qui vous convient. Votre présence lors des séances est très précieuse.",
    mission: 'Renseignez-vous sur les cours de préparation à la naissance disponibles près de chez vous.',
  },
  {
    week: 26,
    title: 'Le bébé entend votre voix',
    body: "Dès 24-26 SA, le bébé peut percevoir les sons. Il reconnaît déjà les voix familières, notamment la vôtre. Parlez-lui, chantez, lisez à voix haute : vous tissez déjà un lien avant même sa naissance.",
    mission: 'Prenez l\'habitude de parler ou de lire au bébé chaque soir avant de dormir.',
  },
  {
    week: 27,
    title: 'Entrée dans le troisième trimestre',
    body: "Le T3 est une période d'accélération. Votre bébé prend environ 200 g par semaine. Votre partenaire peut se sentir plus fatiguée, avoir des douleurs lombaires et du mal à dormir. Les prochaines semaines demandent encore plus de votre présence.",
    mission: 'Commencez à préparer la chambre bébé : peignez, montez les meubles, organisez l\'espace.',
  },
  {
    week: 28,
    title: 'Les mouvements fœtaux à surveiller',
    body: "Dès 28 SA, les mouvements du bébé sont un indicateur clé de son bien-être. Un bon repère : 10 mouvements en 2 heures. En cas de diminution significative, appelez immédiatement la maternité sans attendre. Signalez-le à votre partenaire.",
    mission: 'Expliquez à votre partenaire comment compter les mouvements fœtaux et pourquoi c\'est important.',
  },
  {
    week: 29,
    title: 'Anti-douleurs : soyez vigilant',
    body: "L'ibuprofène et tous les AINS sont formellement contre-indiqués à partir de 24 SA. Ils peuvent provoquer des complications cardiaques et rénales chez le bébé. Seul le paracétamol, à la dose minimale, est accepté. Vérifiez toujours avant de proposer un médicament.",
    mission: 'Retirez l\'ibuprofène et les anti-inflammatoires de l\'armoire à pharmacie.',
  },
  {
    week: 30,
    title: 'La troisième échographie approche',
    body: "L'échographie du 3e trimestre (vers 32 SA) vérifie la croissance du bébé, sa position et l'insertion du placenta. En cas de présentation par le siège, votre équipe médicale discutera des options. Préparez vos questions.",
    mission: 'Confirmez votre présence à l\'échographie du 3e trimestre et vérifiez que tout est noté dans l\'agenda.',
  },
  {
    week: 31,
    title: 'Produits bébé sans perturbateurs endocriniens',
    body: "Lors de l'achat de produits pour le bébé, évitez les plastiques contenant des phtalates et BPA. Préférez le verre, l'inox ou le bois. Pour les cosmétiques bébé, choisissez des formules courtes sans parfum ni conservateurs agressifs. Hēlo peut vous aider.",
    mission: 'Scannez ou vérifiez les 3 premiers produits bébé achetés avec Hēlo.',
  },
  {
    week: 32,
    title: 'Le congé paternité — organisez-vous',
    body: "En France, le congé paternité est de 25 jours (dont 4 obligatoires dans les 8 jours suivant la naissance). Prévenez votre employeur dès maintenant et organisez votre absence. Ce temps avec le bébé et votre partenaire est irremplaçable.",
    mission: 'Déclarez votre congé paternité à votre employeur et planifiez votre absence.',
  },
  {
    week: 33,
    title: 'Douleurs lombaires — comment aider',
    body: "70 % des femmes souffrent de lombalgies au T3. Proposez des massages doux du bas du dos, aidez-la à installer un coussin entre les genoux pour dormir, et évitez de lui demander de porter des objets lourds. Votre aide quotidienne compte.",
    mission: 'Offrez un massage du dos ce soir et installez le coussin de grossesse pour la nuit.',
  },
  {
    week: 34,
    title: 'Le plan de naissance',
    body: "Le plan de naissance résume les souhaits de votre partenaire pour l'accouchement : péridurale, peau à peau, gestion de la douleur, votre présence. Rédigez-le ensemble avec la sage-femme et remettez-le à la maternité.",
    mission: 'Rédigez ou finalisez le plan de naissance et remettez-en une copie à la maternité.',
  },
  {
    week: 35,
    title: 'La valise de maternité',
    body: "Il est temps de préparer la valise de maternité. Pour la maman : documents (carte vitale, carnet de maternité), vêtements confortables, produits de toilette validés. Pour le bébé : body, pyjama, couverture. Pour vous : affaires de rechange et collations.",
    mission: 'Préparez la valise de maternité avec les trois compartiments : maman, bébé, vous.',
  },
  {
    week: 36,
    title: 'Streptocoque B — un dépistage important',
    body: "Le dépistage du streptocoque B a lieu entre 35 et 38 SA. En cas de résultat positif, des antibiotiques seront administrés pendant l'accouchement pour protéger le bébé. Ce n'est pas grave — c'est une précaution standard.",
    mission: 'Vérifiez que le dépistage streptocoque B est planifié et accompagnez si possible.',
  },
  {
    week: 37,
    title: 'À terme, mais encore quelques semaines',
    body: "À 37 SA, le bébé est officiellement à terme. Mais les bébés nés entre 37 et 38 SA + 6 jours peuvent avoir besoin d'une adaptation plus longue. Restez serein : la nature suit son cours. Votre partenaire peut ressentir de l'impatience et de l'anxiété — soyez là.",
    mission: 'Identifiez le trajet vers la maternité et préparez le siège auto dans la voiture.',
  },
  {
    week: 38,
    title: 'Les signes du travail',
    body: "Apprenez à reconnaître les signes du travail : contractions régulières et rapprochées, perte du bouchon muqueux, rupture de la poche des eaux. En cas de doute, appelez la maternité. En cas d'urgence (liquide verdâtre, saignements), allez-y directement.",
    mission: 'Mémorisez les signes du travail et gardez votre téléphone à portée de main en permanence.',
  },
  {
    week: 39,
    title: 'Sac prêt, voiture prête',
    body: "L'accouchement peut survenir à tout moment. Le sac de maternité doit être prêt, posé près de la porte. Le siège auto doit être correctement installé. Vous devez savoir exactement comment rejoindre la maternité à n'importe quelle heure.",
    mission: 'Vérifiez le sac, installez correctement le siège auto et faites un test-trajet vers la maternité.',
  },
  {
    week: 40,
    title: 'Le grand jour approche',
    body: "Le terme est là. Votre bébé peut arriver dans les prochains jours ou semaines. Restez calme, positif et présent pour votre partenaire qui traverse une période d'attente intense. Votre rôle de soutien n'a jamais été aussi important.",
    mission: 'Soyez joignable en permanence et assurez-vous que votre partenaire peut vous contacter à tout moment.',
  },
];

export function getPartnerTipForWeek(week: number): PartnerTip {
  const clamped = Math.max(1, Math.min(40, week));
  return PARTNER_TIPS[clamped - 1];
}
