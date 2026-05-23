// Port of artifacts/helo/lib/productLookup.ts → parseIngredients
// Keep IN SYNC with mobile version so deterministic results are identical.

const NUTRITION_PATTERNS =
  /\b(mati[èe]res?\s+grasses?|acides?\s+gras\s+satur[ée]s?|fibres?\s+alimentaires?|valeur\s+[ée]nerg[ée]tique|sels?\s+min[ée]raux|dont\s+(?:sucres?|acides?))\b/i;

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText.trim()) return [];

  let text = ingredientsText;

  text = text.replace(/\([^)]*\)/g, "");
  text = text.replace(/[()]/g, "");
  text = text.replace(/\d+[,.]?\d*\s*%/g, "");
  text = text.replace(/[*†‡§#]/g, "");

  const cleaned = text
    .split(/[,;.\n]+/)
    .map((s) => s.trim())
    .map((s) => s.replace(/[\s\-–—:.]+$/, "").trim())
    .filter((s) => s.length >= 2)
    .filter((s) => !/:\s*\d/.test(s))
    .filter((s) => !/^dont\b/i.test(s))
    .filter((s) => !NUTRITION_PATTERNS.test(s))
    .filter(
      (s, i, arr) =>
        arr.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i,
    )
    .map(capitalizeFirst);

  return cleaned;
}
