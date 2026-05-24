# Audit de couverture — base ingrédients Hēlo

**Date** : 2026-05-24
**État actuel** : 5 000 entrées uniques (4 sources combinées)
**Verdict honnête** : couverture insuffisante pour une app médicale à 100% de fiabilité.

## 📊 Couverture par source

| Scraper | Type réel | Entrées Helo | Référentiel | Couverture | Status |
|---|---|---|---|---|---|
| `cosing.ts` | **Hardcodé**, regroupé par famille (parabènes, silicones, PEGs…) | 2 039 | ~30 000 INCI | **7%** | 🔴 Très bas |
| `efsa.ts` | **Hardcodé**, regroupé par range E-numbers | 1 540 | ~5 000 additifs | **30%** | 🟠 Moyen |
| `crat.ts` | **Hardcodé**, 23 classes thérapeutiques | 1 094 | ~6 000 DCI | **18%** | 🔴 Bas |
| `medications.ts` | **Hardcodé**, par laboratoire | 1 019 | ~3 000 marques FR | **34%** | 🟠 Moyen |

**Aucun des "scrapers" n'est un vrai scraper** au sens technique — ce sont des fichiers TypeScript de constantes curées manuellement. Conséquence : on ne peut pas "relancer le scraper pour avoir plus de données". Il faut soit (a) écrire des vrais scrapers/imports, soit (b) ajouter manuellement des constantes.

## 🚨 Top 3 gaps critiques par source

### COSING (7%) — le plus large gap absolu
- **Colorants** : ~45 listés sur ~500 CI cosmétiques
- **Tensioactifs PEG complexes** : combinaisons ethoxylées manquantes
- **Actifs botaniques** : ~40 HE listées sur 100+ extraits standardisés

### EFSA (30%) — gap dans la partie haute des E-numbers
- **E500-E999** : seuls ~30 listés alors qu'il y en a ~250 actifs dans l'UE
  - Manque : carbonates (E500-503), antiagglomérants (E551-559), agents de traitement (E900+)
- **Aliments non-additifs** : poissons mercure, fromages cru, plantes — ~50 listés vs ~400 dans la base ANSES
- **Contaminants** : 6 listés (BPA, dioxines, etc.) — manquent nickel, arsenic, mycotoxines détaillées

### CRAT / médicaments (18-34%) — focus à élargir
- **Antibiotiques** : ~30 DCI listés sur ~50 utilisés en France
- **Psychotropes modernes** : 25 listés sur ~80 commercialisés
- **OTC parapharmacie** : ~10 listés sur ~500 (crèmes, gels, spray ORL, etc.)
- **Génériques** : ~20 marques (Biogaran, Teva) sur ~200 actives

## 🎯 Levier ROI max identifié

**Importer le CSV BDPM** (Base de Données Publique des Médicaments — registre obligatoire français, téléchargement libre `base-donnees-publique.medicaments.gouv.fr`) :
- ~15 000 lignes de médicaments référencés
- Permet de passer `medications.ts` de 34% à **60%+** en ~5h de dev
- Effort principal : parser le CSV, mapper vers le format Helo, croiser avec CRAT pour les risk_levels

Code prêt à écrire mais hors scope de cette session (nécessite récupération du CSV + validation).

## 📈 Plan d'extension recommandé (par priorité ROI)

| Action | Effort | Gain attendu |
|---|---|---|
| 1. **E-numbers complets E500-E999** (~150 entrées seed) | 2h | EFSA 30% → 50% |
| 2. **BDPM CSV import** (medications) | 5h | medications 34% → 60% |
| 3. **Synonymes top 200 ingrédients** | 2h | Match rate +5-10% sans grossir le dico |
| 4. **Colorants CI cosmétiques** (CI 11xxx-77xxx) | 3h | COSING 7% → 12% |
| 5. **OTC parapharmacie** (top 300) | 4h | CRAT 18% → 30% |
| 6. **Cosing complet** (10k INCI les plus communs) | 1-2 jours | COSING → 30% |

## 🛡️ Stratégie compensation gap

En attendant que la base soit complète, **3 boucliers** sont déjà en place :
1. **AI fallback Claude Haiku** : quand un ingrédient est `no_signal`, Claude analyse. Coûte ~$0.001 par scan mais comble le gap.
2. **OFF/OBF fallback** : si le produit n'est pas en Supabase, on tape OpenFoodFacts/OpenBeautyFacts.
3. **`indeterminateResponse`** : si tout échoue, on renvoie "à éviter par précaution — consulte ton médecin". Médicalement safe, mais frustrant côté UX.

## 📊 Ce qu'on ne mesure pas (encore) → cf. Lot 9 metrics

Le code actuel n'émet pas ces signaux essentiels :
- Taux de match par scan (n_matched / n_total_ingredients)
- Top ingrédients récurrents en `no_signal` (queue à enrichir)
- Source du verdict (deterministic vs AI vs indeterminate) — % de chaque
- Latence end-to-end par source

→ Implémenté dans le Lot 9 (cf. `scan.ts:emit_scan_coverage`).
