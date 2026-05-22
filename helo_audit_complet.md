# Hēlo — Audit complet & analyse business

## 🔴 Problèmes techniques (priorisés)

### P0 — Bloquants pour le launch

1. **Coût Chat IA non capé**
   - Anthropic en direct, pas de limite stricte par user
   - Risque : 30-50k€/an de tokens si 50k DAU dont 95% gratuits
   - Fix : cap dur 10 msg/jour Premium, cache agressif, modèle plus petit pour 80% des cas

2. **Zéro analytique / event tracking**
   - Pas de PostHog, Mixpanel, Amplitude
   - Tu lances à l'aveugle, impossible d'itérer
   - Funnel critique à instrumenter :
     `app_open → first_scan → scan_success → second_scan → day_2_return → paywall_view → paywall_convert`

3. **Pas de validation médicale publique**
   - Aucune sage-femme/gynéco citée
   - Risque réputationnel : un tweet d'un médecin peut tuer la crédibilité
   - Fix : 1 sage-femme conseillère visible (200€/mois suffit)

### P1 — Important avant launch

4. **AR Mirror caché en V1 — mais d'autres features sont sans doute dans le même état**
   - Audit "ready for prod / hidden V2" à faire sur TOUTES les features
   - Suspects à vérifier : scan-party, voice, prescription scan, scan-menu restaurant
   - Mieux vaut 5 features à 100% que 50 à 80%

5. **Onboarding 10 slides = trop long pour 2026**
   - Drop-off estimé : 30-40% entre slide 1 et slide 10
   - Réduire à 6 slides max

6. **Premium = value prop pas cristalline**
   - Une enceinte doit comprendre POURQUOI payer 7€/mois en 3 secondes
   - Pas une liste de 12 bullets — 3 bénéfices clairs max

7. **Pas de test utilisateur réel**
   - Aucun test sur 5 femmes enceintes vraies
   - Le flow de scan est LE moment de vérité — il doit être impeccable
   - Non négociable avant launch

### P2 — À surveiller

8. **Permission caméra refusée = cul-de-sac**
   - Le bouton "Autoriser" appelle `requestCameraPermission` qui sur iOS ne re-prompt pas
   - Fix : `Linking.openSettings()` quand déjà refusé

9. **Marché France seul est trop petit pour > 100k€ ARR**
   - Prévoir sortie Belgique/Suisse/Québec rapidement

---

## 🟡 Problèmes du Mode Miroir AR (caché V1, à fixer en V2)

### Bloquants pour vraie expé "wow"

1. **Cache-only = 95% des produits apparaissent en gris**
   - Le miroir ne lit que `@helo_offline_cache` (scans passés)
   - Première fois user pointe étagère → tout "non scanné" → effet wow raté
   - TODO mort dans le code : `LOOKUP_DEBOUNCE_MS` existe mais lookup réseau pas implémenté

2. **Pas de vraie reconnaissance produit**
   - Si code-barres pas visible (produit retourné, étiquette abîmée) → zéro détection
   - Vraie AR utiliserait visual matching (ML Kit ou CLIP embeddings)

3. **Halos qui sautillent**
   - Polling 150ms + recalcul complet `renderItems` à chaque tick
   - Manque smoothing (Kalman filter ou lerp simple)

### Qualité technique

4. **`Halo` mal mémoizé**
   - `React.memo` mais `item.opacity` et `item.x/y` changent à chaque tick
   - Re-render systématique, `useSharedValue` créé/détruit en boucle

5. **`normaliseBounds` dépend orientation caméra**
   - Mapping inversé en landscape sur certains Android — pas géré

6. **ViewShot + share = lent**
   - Capture bloque thread JS ~300-500ms
   - Caméra continue pendant ce temps → freeze perceptible
   - Fix : pause caméra pendant capture

7. **Zéro test unitaire sur `ar-mirror`**

### Roadmap V2 Mode Miroir AR

| Priorité | Tâche | Effort |
|----------|-------|--------|
| 🔴 P0 | Implémenter lookup réseau debounced (TODO mort) | 2h |
| 🔴 P0 | Smoothing positions halos (lerp) | 1h |
| 🟡 P1 | `Linking.openSettings()` sur permission refusée | 15min |
| 🟡 P1 | Pause caméra pendant `ViewShot.capture()` | 30min |
| 🟢 P2 | Compteur "X produits dans ton cache" sur écran de gate | 20min |
| 🟢 P2 | Tests unitaires `ar-mirror` | 2h |

---

## 🟢 Ce qui est bien fait

1. **Positionnement clair** — "Yuka pour la grossesse" en luxe, niche précise, wedge évident
2. **Data = vrai moat** — 5 000 ingrédients sourcés (CosIng + EFSA + CRAT + médicaments) + 16 799 produits
3. **DA solide** — cream #FFFAF5 + or #C9A96E + Plus Jakarta Sans, identité visible à 1m
4. **Code sain** — 220 tests / 17 suites, 0 erreur TS, refacto récents (scan.tsx 916→567L, compare.tsx 916→360L)
5. **Sécurité** — Edge Functions Supabase pour secrets (plus de clés API en clair)
6. **Légal** — Disclaimers médicaux partout, CGU + RGPD propres
7. **Onboarding émotionnel** — crée attachement avant friction du profil
8. **Leviers rétention** — Pacte Hēlo (engagement) + Cercle (social) + Score Maison (gamification placard)

---

## 💰 Analyse business

### Marché adressable

- France : ~700k naissances/an, ~2M femmes en âge de procréer préoccupées → **TAM réaliste 500k users sur 3 ans**
- Francophonie élargie (Belgique + Suisse + Québec + Maghreb urbain) : ×1,8 → **~900k**

### Scénarios revenu (24 mois)

| Scénario | DAU | Conversion Premium | ARPU/mois | MRR | ARR |
|----------|-----|-------------------|-----------|-----|-----|
| Pessimiste | 5 000 | 2% | 7€ | 700€ | **8,4k€** |
| Réaliste | 30 000 | 4% | 7€ | 8,4k€ | **100k€** |
| Bon scénario | 100 000 | 5% | 8€ | 40k€ | **480k€** |
| Yuka-like | 500 000 | 6% | 8€ | 240k€ | **2,9M€** |

### Probabilités estimées sur 24 mois

- 🔴 **30%** — Échec commercial (< 1k payants, maintenance)
- 🟡 **45%** — Side business confortable (5-30k€/an MRR)
- 🟢 **20%** — Vrai business solo (50-150k€/an, vivable)
- 🚀 **5%** — Breakout (500k€+ ARR, levée ou exit)

**Espérance pondérée ≈ 60-80k€/an à 24 mois**

### Pourquoi ça peut marcher

1. **Grossesse = moment de paiement maximal** — 40 objets achetés en 9 mois, pricing power énorme
2. **Rétention mécanique** — 9 mois grossesse + 6 mois allaitement + 24 mois cosmétiques bébé = **LTV 84-126€/user payant**
3. **CAC potentiellement bas** — TikTok pregnancy gratuit + sages-femmes prescriptrices + ASO sur "grossesse"
4. **Multi-revenus** : B2C Premium + B2B2C maternités (5-10k€/pack) + Affiliation (Avène, Mustela, Weleda 15-30%) + Data anonymisée + API B2B

### Risques économiques

1. **Coût IA** — peut atteindre 0,50-1€/user actif/mois sur Chat IA
2. **Apple/Google 30%** — toujours raisonner en revenu net (4,90€ sur 7€)
3. **CAC payant peut exploser** — 15-40€/install sur Meta Ads pour cette audience
4. **Yuka peut crusher en 6 mois** s'ils sortent un mode grossesse

---

## ⚠️ Risques stratégiques (au-delà du tech)

1. **Burnout solo** — tu portes tech + design + marketing + légal + GTM
   → Trouver cofondateur growth/marketing **maintenant**, pas dans 6 mois

2. **Pas de validation médicale**
   → Sage-femme conseillère visible publiquement, urgent

3. **50+ features pour V1 = trop**
   → Couper encore, focus sur 5-7 features impeccables

4. **Fenêtre concurrentielle ~12 mois**
   → Atteindre 50k DAU avant que Yuka ne dégaine

---

## ✅ Plan d'action recommandé avant launch

| Priorité | Tâche | Effort |
|----------|-------|--------|
| 🔴 P0 | Audit "ready vs hidden V2" sur toutes les features | 1 jour |
| 🔴 P0 | Test 5 utilisatrices vraies sur flow de scan | 2 jours |
| 🔴 P0 | Cap dur Chat IA + monitoring coûts | 2h |
| 🔴 P0 | Trouver 1 sage-femme conseillère citée publiquement | 1 semaine |
| 🟡 P1 | Instrumenter PostHog sur 10 events critiques | 4h |
| 🟡 P1 | Réduire onboarding à 6 slides max | 2h |
| 🟡 P1 | Clarifier paywall — 3 bénéfices max | 2h |
| 🟢 P2 | Préparer GTM TikTok pregnancy (10 vidéos teaser) | 1 semaine |
| 🟢 P2 | Démarcher 5 maternités/cliniques privées | 2 semaines |

---

## 🎯 TL;DR

- **Produit** : 8/10 pour une V1 indé, au-dessus de 90% des apps santé femmes
- **Tech** : 80% du chemin de la V1 fait — propre, maintenable, testé
- **Business** : potentiel réel 30-100k€/an à 24 mois, breakout possible 500k€+
- **Risque principal** : pas le produit, **le go-to-market**
- **Recommandation** : ne PAS abandonner. Time-box : publier dans 4 semaines, donner 6 mois post-launch pour atteindre objectifs honnêtes, stop-loss si zéro traction malgré vrai effort GTM
