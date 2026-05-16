import type { Phase } from '@/types';

export type VerdictKind = 'safe' | 'caution' | 'danger';

export interface ContextualQuote {
  text: string;
  source: string;
}

/**
 * getContextualQuote — Moment 1 (v1.1 brief, déc. 2025)
 *
 * Phrase courte et crédible affichée sous le verdict produit, signée
 * par une source de référence (CRAT, EFSA, ANSES). Personnalisée selon
 * la phase (trimestre / allaitement) et le verdict.
 *
 * Règles :
 *  - Toujours retourner une `source` réelle (pas de signature fictive).
 *  - Phrases en français, ton sobre et factuel — jamais anxiogène.
 *  - Longueur cible : 60–110 caractères pour rentrer en deux lignes.
 */
export function getContextualQuote(
  phase: Phase,
  verdict: VerdictKind,
): ContextualQuote {
  if (verdict === 'danger') {
    if (phase === 'breastfeeding') {
      return {
        text: 'Pendant l\'allaitement, mieux vaut éviter ce produit — certains composants passent dans le lait.',
        source: 'CRAT',
      };
    }
    if (phase === 1) {
      return {
        text: 'Le 1er trimestre est la période la plus sensible pour le développement de l\'embryon.',
        source: 'CRAT',
      };
    }
    if (phase === 3) {
      return {
        text: 'En fin de grossesse, certains composants peuvent affecter le bébé à naître.',
        source: 'CRAT',
      };
    }
    return {
      text: 'À éviter pendant la grossesse — des alternatives plus sûres existent.',
      source: 'CRAT',
    };
  }

  if (verdict === 'caution') {
    if (phase === 'breastfeeding') {
      return {
        text: 'Usage occasionnel acceptable pendant l\'allaitement, en parler à votre sage-femme si doute.',
        source: 'CRAT',
      };
    }
    if (phase === 1) {
      return {
        text: 'Usage modéré conseillé au 1er trimestre — privilégiez des alternatives mieux étudiées.',
        source: 'CRAT',
      };
    }
    return {
      text: 'Acceptable de façon ponctuelle, à éviter en usage quotidien prolongé.',
      source: 'CRAT',
    };
  }

  // safe
  if (phase === 'breastfeeding') {
    return {
      text: 'Compatible avec l\'allaitement selon les données disponibles.',
      source: 'CRAT',
    };
  }
  if (phase === 1) {
    return {
      text: 'Aucun signal de toxicité connu au 1er trimestre.',
      source: 'CRAT',
    };
  }
  if (phase === 2) {
    return {
      text: 'Aucun signal de toxicité connu au 2ème trimestre.',
      source: 'CRAT',
    };
  }
  return {
    text: 'Aucun signal de toxicité connu au 3ème trimestre.',
    source: 'CRAT',
  };
}
