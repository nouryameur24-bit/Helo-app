export function glowColor(score: number): string {
  if (score > 80) return '#7CB69F';
  if (score >= 60) return '#C9A96E';
  if (score >= 40) return '#D4A853';
  return '#C27B7B';
}

export function glowLabel(score: number): string {
  if (score > 80) return 'Excellent ✨';
  if (score >= 60) return 'Bon niveau 👍';
  if (score > 0) return 'À améliorer';
  return 'Scannez vos produits';
}

export function phaseEmoji(trimester: number): string {
  if (trimester === 1) return '🌱';
  if (trimester === 2) return '🌸';
  return '🌿';
}
