# Hēlo — App Store Metadata

## Informations générales

| Champ | Valeur |
|---|---|
| **Nom de l'app** | Hēlo |
| **Sous-titre** | Scanner grossesse & allaitement |
| **Bundle ID (iOS)** | com.helo.app |
| **Package (Android)** | com.helo.app |
| **Version actuelle** | 1.0.0 |
| **Catégorie principale** | Santé et forme |
| **Catégorie secondaire** | Grossesse & parentalité |
| **Âge minimum** | 4+ |
| **Prix** | Freemium (abonnement premium) |

---

## App Store Connect (iOS)

### Nom (30 car. max)
```
Hēlo
```

### Sous-titre (30 car. max)
```
Scanner grossesse & allaitement
```

### Description courte (Promotional text, 170 car. max)
```
Scannez vos produits en 2 secondes et découvrez s'ils sont compatibles avec votre grossesse. 5 000+ ingrédients analysés par des experts.
```

### Description longue (4 000 car. max)
```
Hēlo est votre compagnon de grossesse intelligent. Scannez n'importe quel produit — cosmétique, alimentaire ou médicament — et obtenez instantanément une analyse de sécurité adaptée à votre trimestre.

🔍 SCANNER INTELLIGENT
• Scannez les codes-barres en 1 seconde
• Analyse de l'étiquette INCI en temps réel par IA
• Base de données de 5 000+ ingrédients vérifiés par trimestre
• Catégories : cosmétiques, alimentation, médicaments

🌿 BASE DE DONNÉES EXPERTE
• Cosmétiques : filtres UV, conservateurs, perturbateurs endocriniens
• Alimentation : contaminants, risques microbiologiques, allergènes
• Médicaments : génériques, vaccins, anticoagulants, anti-épileptiques
• Mise à jour continue selon les recommandations CRAT, EFSA, ANSM

📚 MON PLACARD
• Sauvegardez vos produits favoris
• Organisez par catégorie (soin, cuisine, médication)
• Accès hors connexion complet

👶 MODE BÉBÉ & ALLAITEMENT
• Basculez automatiquement après la naissance
• Analyse spécifique post-partum
• Compatibilité allaitement de chaque ingrédient

🤝 CERCLE (Co-parentalité)
• Partagez vos analyses avec votre co-parent
• Liste commune de produits approuvés
• Notifications synchronisées

📊 JOURNAL DE GROSSESSE
• Suivez votre trimestre semaine par semaine
• Rappels personnalisés
• Brief hebdomadaire avec conseils nutritionnels

---
*Hēlo est un outil d'information et ne remplace pas l'avis de votre médecin ou sage-femme. Consultez toujours un professionnel de santé pour toute décision médicale.*
```

### Mots-clés (100 car. max, séparés par virgules)
```
grossesse,enceinte,scanner,ingrédients,cosmétiques,sécurité,bébé,trimestre,INCI,allaitement
```

### URL de support
```
https://helo.app/support
```

### URL de confidentialité
```
https://helo.app/privacy
```

### URL marketing
```
https://helo.app
```

---

## Google Play Store (Android)

### Titre (50 car. max)
```
Hēlo — Scanner grossesse & allaitement
```

### Description courte (80 car. max)
```
Scannez vos produits et vérifiez leur sécurité pendant la grossesse. 5 000+ ingrédients.
```

### Description longue (4 000 car. max)
*(Identique à la description App Store ci-dessus)*

### Étiquettes (tags)
```
grossesse, scanner produits, ingrédients, sécurité grossesse, cosmétiques, allaitement
```

---

## Screenshots requis

### iPhone 6.9" (iPhone 16 Pro Max)
1. Écran d'accueil — Dashboard trimestre
2. Scanner en action — code-barre scanné
3. Résultat d'analyse — fiche ingrédient
4. Mon Placard — liste produits sauvegardés
5. Mode Bébé — allaitement

### iPhone 6.5" (iPhone 15 Plus)
*(Mêmes 5 écrans, résolution adaptée)*

### iPad 13" (iPad Pro)
*(5 écrans en mode tablette, layout paysage)*

### Android Phone
*(5 écrans identiques iOS)*

---

## App Review Notes (Apple)
```
Test account:
- Email: reviewer@helo-test.com
- Password: HeloReview2024!

Notes:
- L'app nécessite une connexion Supabase pour le scan complet.
- En mode démo (sans compte), toutes les fonctionnalités sont accessibles via des données mockées.
- La caméra est utilisée uniquement pour le scan de codes-barres.
- Aucune donnée médicale n'est partagée avec des tiers.
```

---

## Politique de confidentialité — Résumé RGPD

| Donnée collectée | Usage | Rétention |
|---|---|---|
| Date de terme (trimestre) | Personnalisation analyses | Locale uniquement |
| Historique de scans | Mon Placard | Compte utilisateur |
| Email (optionnel) | Authentification | Jusqu'à suppression compte |
| Données caméra | Scan barcode temps réel | Non stocké |

**Partage tiers** : Aucun. Les analyses sont effectuées localement ou via Supabase (hébergement EU).

---

## In-App Purchases

| Produit | Type | Prix suggéré |
|---|---|---|
| `helo_premium_monthly` | Abonnement mensuel | 4,99 € / mois |
| `helo_premium_yearly` | Abonnement annuel | 34,99 € / an |
| `helo_premium_lifetime` | Achat unique | 89,99 € |

**Fonctionnalités Premium** :
- Scan illimité (gratuit : 10/jour)
- Analyse IA des étiquettes photos
- Cercle co-parent
- Alertes rappels produits
- Export PDF du journal
