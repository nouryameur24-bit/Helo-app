
# Mon avis honnête sur Hēlo

## Ce qui est très fort 💪

- **La base de données** : 5 000 ingrédients sourcés CRAT/EFSA/COSING + 16 799 produits, c'est un vrai moat. Beaucoup d'apps "Yuka pregnancy" se contentent de scraper OFF.
- **L'attention au cadre légal** : disclaimer modal versionné, CGU, politique RGPD, méthodologie publique, et maintenant le filtre médicaments avec redirection CRAT — c'est la bonne posture pour éviter le statut de dispositif médical en France.
- **L'architecture après refactor** : composants découpés (compare/, scan/, voice/, nutrition/...), 190 tests, 0 erreur TS, logger structuré, routes typées. C'est propre, c'est maintenable.
- **Le design system** : cohérent (Plus Jakarta Sans, palette nude/or, Spacing/Radius/Shadows centralisés). Le positionnement "luxe et sereine" est tenu.

## Ce qui m'inquiète sérieusement ⚠️

### 1. Le périmètre fonctionnel est démesuré
J'ai compté : scan code-barre, OCR ingrédients, scan rayonnage, comparateur, scan ordonnance, scan menu resto, scan panier, voice assistant, chat IA, briefing voyage, journal, mode partenaire, miroir AR, weekly brief, nutrition IA, home score, mémoires, pacte, cercle, timeline, widget Apple Watch...

**C'est 20+ features pour une v1.** Yuka a percé avec UNE chose excellente. Ici le risque c'est d'être moyen partout. Je couperais 60% pour le lancement et je garderais : **scan + verdict + chat + shelf + nutrition**. Le reste en post-launch progressif.

### 2. Le chat IA reste le maillon le plus risqué juridiquement
Même avec ton filtre médicaments + le system prompt strict, dès qu'une utilisatrice tape "j'ai mal au ventre" Claude répond. Si une seule réponse foire et qu'elle est partagée sur les réseaux, c'est viral négatif. Je conseille fortement :
- (a) une 2e couche de filtres "symptômes urgents" côté serveur
- (b) un audit log de TOUTES les conversations chat les 6 premiers mois
- (c) faire valider les prompts par un médecin référent pour pouvoir le citer

### 3. Deux routes mortes restent
`/premium` et `/profile/edit` — petites mais elles révèlent que des features ont été codées sans QA d'intégration. Je parierais qu'il y en a d'autres ailleurs (deeplinks cassés, états vides non testés).

Avant App Store, **un test e2e Playwright/Maestro sur les 10 parcours principaux** est non-négociable.

### 4. La feature Cercle (communauté)
Sans modération UGC active dès le J1 (commentaires, signalements, ban), c'est un risque DSA en EU. Soit tu lances avec modération automatique + humaine, soit tu la retires de la v1.

### 5. Pas vu de stratégie de monétisation claire
Dans le code (paywall existe mais sur quoi exactement ? freemium ? quel pricing ? quelles features gated ?). C'est ce qui doit être pensé avant la review App Store, pas après.

## Note globale honnête

Techniquement c'est niveau **8/10**, produit c'est **6/10** à cause du périmètre.

**L'app est App Store-ready côté code, mais pas côté produit** — je la pousserais pas en review tant que tu n'as pas :
- (a) tranché le scope v1
- (b) testé e2e les parcours principaux
- (c) fait valider le chat par un pro de santé
