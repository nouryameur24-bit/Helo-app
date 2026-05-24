# Benchmark de fiabilité — 50 produits gold-standard

**But** : dataset de référence pour mesurer la fiabilité réelle de la base ingrédients + matcher Helo. À utiliser :
1. Localement avec `scripts/src/benchmark.ts` (à venir) pour mesurer hit rate sans aller en prod
2. Manuellement comme checklist avant chaque release : "ces 50 produits doivent retourner le bon verdict"

## Méthodologie

Chaque produit liste :
- **Code-barres** EAN13 réel (vérifié sur OFF/OBF)
- **Nom + marque**
- **Catégorie** : food / cosmetic / medication
- **Verdict attendu T1/T2/T3/breastfeeding** : basé sur sources médicales (CRAT, ANSM, EFSA)
- **Source de vérité** : référence pour le verdict (CRAT, gynéco-obstétricien validé, etc.)

Les produits sont choisis pour couvrir :
- **Top vendeurs supermarché français** (Carrefour, Monoprix, Leclerc)
- **Top pharmacie/parapharmacie** (Mustela, La Roche-Posay, Avène)
- **Médicaments OTC fréquents** (Doliprane, Spasfon, Smecta)
- **Cas piège connus** : moutarde (vinaigre d'alcool), Coca Zero (caféine + aspartame), Nutella (huile de palme)

## 🍽️ Alimentation (20 produits)

| Barcode | Nom | Marque | Verdict T2 attendu | Source |
|---|---|---|---|---|
| 3046920022620 | Moutarde de Dijon | Amora | ✅ safe | CRAT — vinaigre d'alcool sûr |
| 5449000000996 | Coca-Cola Original | Coca-Cola | ⚠️ caution | OMS — caféine, sucre élevé |
| 5449000054227 | Coca-Cola Zero | Coca-Cola | 🚫 danger | EFSA — aspartame T3 + caféine |
| 3017620422003 | Nutella | Ferrero | ⚠️ caution | EFSA — huile de palme, sucre |
| 7622210449283 | LU Petit Beurre | LU | ✅ safe | EFSA — ingrédients basiques |
| 3270190022114 | Yaourt nature | Yoplait | ✅ safe | ANSES — lait pasteurisé OK |
| 3083680021586 | Comté AOP 6 mois | Entremont | ⚠️ caution | CRAT — fromage lait cru (vérifier T1) |
| 3083680890014 | Camembert lait cru | Lanquetot | 🚫 danger | CRAT — listériose risk |
| 8076809513753 | Spaghetti n°5 | Barilla | ✅ safe | Aliment de base |
| 3017800238738 | Saumon fumé | Labeyrie | 🚫 danger | ANSES — listériose risk |
| 3033710073320 | Tarama | La Maison du Caviar | ⚠️ caution | ANSES — poisson cru |
| 3245412478611 | Houmous | Carrefour | ✅ safe | Aliment cuit |
| 8000500037522 | Kinder Bueno | Ferrero | ⚠️ caution | EFSA — sucres élevés |
| 3068320082011 | Eau minérale Evian | Evian | ✅ safe | Eau plate |
| 3274080005003 | Perrier | Perrier | ✅ safe | Eau gazeuse |
| 5410673001011 | Red Bull | Red Bull | 🚫 danger | OMS — taurine + caféine élevée |
| 8000500031452 | Mon Chéri | Ferrero | 🚫 danger | Contient alcool (cerise au kirsch) |
| 3023290191002 | Vin de cuisine Bordeaux | Carrefour | 🚫 danger | OMS — alcool zéro grossesse |
| 3268840001008 | Café moulu | Carte Noire | ⚠️ caution | OMS — caféine (200mg/j max) |
| 3175680011114 | Thé vert Lipton | Lipton | ⚠️ caution | EFSA — caféine modérée |

## 💊 Médicaments OTC (10 produits)

| Barcode | Nom | DCI | Verdict T2 attendu | Source |
|---|---|---|---|---|
| 3400938813241 | Doliprane 1000mg | Paracétamol | ✅ safe (dose contrôlée) | CRAT — 1er choix grossesse |
| 3400934850554 | Spasfon Lyoc | Phloroglucinol | ✅ safe | CRAT — antispasmodique sûr |
| 3400930011645 | Smecta | Diosmectite | ✅ safe | CRAT — argile sûre |
| 3400930017050 | Gaviscon menthe | Algéniques + bicarbonate | ✅ safe | CRAT — antiacide local |
| 3400938242522 | Nurofen 200mg | Ibuprofène | 🚫 danger | CRAT — AINS interdits >24SA, déconseillés avant |
| 3400938082395 | Aspirine 500mg | Acide acétylsalicylique | 🚫 danger | CRAT — interdit T3 |
| 3400930081532 | Voltarène gel | Diclofénac | 🚫 danger | CRAT — AINS topique aussi |
| 3400938813180 | Efferalgan | Paracétamol | ✅ safe | CRAT — = Doliprane |
| 3400933965204 | Imodium 2mg | Lopéramide | ⚠️ caution | CRAT — usage limité |
| 3400935943378 | Stilnox 10mg | Zolpidem | 🚫 danger | CRAT — déconseillé |

## 🧴 Cosmétiques (15 produits)

| Barcode | Nom | Marque | Verdict T2 attendu | Source |
|---|---|---|---|---|
| 3401528584008 | Crème change 1 2 3 | Mustela | ✅ safe | Dermo-pédiatrique |
| 3401528545016 | Lait corps hydratant | Mustela | ✅ safe | Sans parabène |
| 3337875811057 | Tolériane Sensitive | La Roche-Posay | ✅ safe | Dermo-pharmacie |
| 3282770100969 | Cicalfate+ | Avène | ✅ safe | Dermo-pharmacie |
| 4005900588128 | Crème Nivea | Nivea | ⚠️ caution | Contient parabens (vérifier composition) |
| 3600523716937 | L'Oréal Revitalift | L'Oréal | 🚫 danger | Rétinol — interdit grossesse |
| 3600523474929 | Garnier BB Crème | Garnier | ⚠️ caution | Filtre UV chimique |
| 3401353013906 | Bioderma H2O | Bioderma | ✅ safe | Dermo-pharmacie |
| 8002730000010 | Avène thermal water | Avène | ✅ safe | Eau thermale |
| 3401353012541 | Atoderm Intensive | Bioderma | ✅ safe | Sans parabène |
| 3282770208368 | Sérum Vitamine C | Avène | ⚠️ caution | Vitamin C OK mais bordeline |
| 8001090375605 | Pantène shampoing | Pantène | ⚠️ caution | Sulfates (SLS/SLES) |
| 3614225826320 | Klorane shampoing camomille | Klorane | ✅ safe | Doux, sans sulfate |
| 3346470207257 | Vinaigre de cidre BIO | La Tourangelle | ✅ safe | Vinaigre = safe override |
| 4005808884995 | Nivea déodorant | Nivea | ⚠️ caution | Sels d'aluminium |

## 👶 Bébé / allaitement (5 produits)

| Barcode | Nom | Marque | Verdict baby attendu | Source |
|---|---|---|---|---|
| 3596710476640 | Lait 1er âge | Picot | ✅ safe | Spécifique nourrisson |
| 3275712070095 | Liniment oléo-calcaire | Gilbert | ✅ safe | Standard parapharmacie |
| 3401596413028 | Eau thermale Avène | Avène | ✅ safe | Hypoallergénique |
| 3596710432004 | Cérélac 6 mois | Nestlé | ✅ safe | Adapté nourrisson |
| 3400933650513 | Dolipranetabs enfant | Paracétamol | ✅ safe | Dose pédiatrique |

## 🎯 Métriques de fiabilité cible

Sur ce dataset, pour considérer l'app **production-ready** :
- **Hit rate Supabase + OFF/OBF** : ≥ 95% (au moins 47/50 trouvent un produit avec ingrédients)
- **Verdict accuracy** : ≥ 90% (45/50 verdicts cohérents avec la colonne attendue)
- **Faux "safe" sur danger réel** : **0** (zéro tolérance — risque légal)
- **Faux "danger" sur safe réel** : ≤ 10% (acceptable, c'est conservateur)

## Mise à jour

À reviewer par un médecin/sage-femme advisor avant le launch App Store. Les verdicts ci-dessus sont basés sur les sources publiques (CRAT, ANSM, EFSA) mais doivent être validés par un humain qualifié.

## Comment utiliser

### Manuel
1. Scanne chaque barcode sur ton device de test
2. Note le verdict réel renvoyé par l'app
3. Compare avec la colonne "Verdict attendu"
4. Calcule les métriques (accuracy, faux positifs, faux négatifs)

### Automatique (script à écrire)
```bash
# Une fois en place :
cd /Users/nouryameur/Documents/Helo-app/scripts
npx tsx src/benchmark.ts --base-url=https://api.gethelo.app
# → output: rapport markdown + JSON
```

Le script est à écrire en post-launch — nécessite l'API live et un APP_SECRET de test.
