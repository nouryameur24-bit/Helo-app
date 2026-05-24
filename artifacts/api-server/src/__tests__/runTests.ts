/**
 * runTests.ts — Mini test runner pour les modules pure-logic de api-server.
 *
 * Couvre les fonctions qui n'ont pas besoin de la DB Supabase :
 *  - parseIngredients (toute la pipeline d'extraction)
 *  - sourceToDomain (classification source → domain)
 *  - matchSafeOverride (whitelist alcools gras, vinaigres)
 *  - matchFoodContextOverride (alcool standalone, E-numbers)
 *  - computeVerdict (calcul GlowScore)
 *
 * Pourquoi pas Jest/Vitest : zero deps, démarrage instantané, exécutable
 * via `npx tsx src/__tests__/runTests.ts`. Quand on aura besoin de mocker
 * Supabase pour tester `matchDeterministic` de bout en bout, on migrera
 * vers Vitest. Pour l'instant la couverture pure-logic suffit à empêcher
 * les régressions du genre v3→v4 (sourceToDomain qui amputait 50% du dico).
 */

import assert from "node:assert/strict";

import { parseIngredients } from "../lib/parseIngredients";
import {
  computeVerdict,
  matchFoodContextOverride,
  matchSafeOverride,
  sourceToDomain,
  type MatchResult,
} from "../lib/matcher";

// ─── Mini runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: { name: string; err: unknown }[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  ✗ ${name}`);
  }
}

function group(label: string, fn: () => void): void {
  console.log(`\n${label}`);
  fn();
}

// ─── parseIngredients ───────────────────────────────────────────────────────

group("parseIngredients", () => {
  test("empty input → []", () => {
    assert.deepEqual(parseIngredients(""), []);
    assert.deepEqual(parseIngredients("   "), []);
  });

  test("simple comma list", () => {
    const out = parseIngredients("eau, sucre, sel");
    assert.deepEqual(out, ["Eau", "Sucre", "Sel"]);
  });

  test("strips percentages with comma/dot decimal", () => {
    const out = parseIngredients("eau 21,5%, sucre 3.2%, sel");
    assert.deepEqual(out, ["Eau", "Sucre", "Sel"]);
  });

  test("normalizes ALLERGEN CAPS → lowercase", () => {
    const out = parseIngredients("eau, lait, SOJA, GLUTEN");
    assert.deepEqual(out, ["Eau", "Lait", "Soja", "Gluten"]);
  });

  test("extracts parenthesized sub-items", () => {
    const out = parseIngredients("émulsifiants (lécithines de soja), sucre");
    // Order: main items first, then sub-items
    assert.ok(out.includes("Émulsifiants"));
    assert.ok(out.includes("Lécithines de soja"));
    assert.ok(out.includes("Sucre"));
  });

  test("strips leading language prefix 'en:'", () => {
    const out = parseIngredients("en:e145, fr:colorant caramel");
    assert.deepEqual(out, ["E145", "Colorant caramel"]);
  });

  test("strips leading language prefix without colon (OFF malformed)", () => {
    const out = parseIngredients("en natural flavouring, fr arôme naturel");
    assert.deepEqual(out, ["Natural flavouring", "Arôme naturel"]);
  });

  test("filters out 'dont sucres' (sub-categorization markers)", () => {
    const out = parseIngredients("sucre, dont sucres simples, sel");
    assert.deepEqual(out, ["Sucre", "Sel"]);
  });

  test("filters out nutritional patterns", () => {
    const out = parseIngredients("matières grasses, sucre, fibres alimentaires");
    assert.deepEqual(out, ["Sucre"]);
  });

  test("deduplicates case-insensitive", () => {
    const out = parseIngredients("Sucre, SUCRE, sucre, sel");
    assert.deepEqual(out, ["Sucre", "Sel"]);
  });

  test("real-world Moutarde Amora ingredients", () => {
    const out = parseIngredients(
      "Eau, graines de moutarde (21,5%), vinaigre d'alcool, sel, acide citrique, disulfite de potassium.",
    );
    assert.ok(out.includes("Eau"));
    assert.ok(out.includes("Sel"));
    assert.ok(out.some((s) => s.toLowerCase().includes("vinaigre")));
    assert.ok(out.some((s) => s.toLowerCase().includes("acide citrique")));
  });
});

// ─── sourceToDomain (v4 fix) ────────────────────────────────────────────────

group("sourceToDomain (food/medication/cosmetic classification)", () => {
  test("EFSA alone → food", () => {
    assert.equal(sourceToDomain("EFSA"), "food");
  });

  test("ANSES alone → food (v4 fix)", () => {
    assert.equal(sourceToDomain("ANSES"), "food");
  });

  test("CIQUAL alone → food (v4 fix)", () => {
    assert.equal(sourceToDomain("CIQUAL"), "food");
  });

  test("OMS alone → food (v4 fix)", () => {
    assert.equal(sourceToDomain("OMS"), "food");
  });

  test("FDA alone → food (v4 fix)", () => {
    assert.equal(sourceToDomain("FDA"), "food");
  });

  test("ANSM alone → medication", () => {
    assert.equal(sourceToDomain("ANSM"), "medication");
  });

  test("CRAT alone → medication", () => {
    assert.equal(sourceToDomain("CRAT"), "medication");
  });

  test("BDPM alone → medication", () => {
    assert.equal(sourceToDomain("BDPM"), "medication");
  });

  test("HAS alone → medication", () => {
    assert.equal(sourceToDomain("HAS"), "medication");
  });

  test("Cosing alone → cosmetic", () => {
    assert.equal(sourceToDomain("cosing"), "cosmetic");
  });

  test("SCCS alone → cosmetic", () => {
    assert.equal(sourceToDomain("SCCS"), "cosmetic");
  });

  test("empty/null → cosmetic (default)", () => {
    assert.equal(sourceToDomain(""), "cosmetic");
    assert.equal(sourceToDomain(null), "cosmetic");
  });

  test("ANSES + EFSA combined → food", () => {
    assert.equal(sourceToDomain("ANSES, EFSA"), "food");
  });

  test("ANSM + CRAT combined → medication", () => {
    assert.equal(sourceToDomain("ANSM, CRAT"), "medication");
  });
});

// ─── matchSafeOverride (whitelist alcools/vinaigres) ────────────────────────

group("matchSafeOverride (false-positive whitelist)", () => {
  test("vinaigre d'alcool → safe", () => {
    const r = matchSafeOverride("vinaigre d'alcool");
    assert.ok(r);
    assert.equal(r.label, "Vinaigre");
  });

  test("vinaigre blanc → safe", () => {
    const r = matchSafeOverride("vinaigre blanc");
    assert.ok(r);
  });

  test("cetearyl alcohol → safe", () => {
    const r = matchSafeOverride("cetearyl alcohol");
    assert.ok(r);
    assert.ok(r.label.toLowerCase().includes("gras"));
  });

  test("benzyl alcohol → safe (conservateur cosmétique)", () => {
    const r = matchSafeOverride("benzyl alcohol");
    assert.ok(r);
  });

  test("plain 'alcool' → NOT in whitelist (must trigger food override instead)", () => {
    assert.equal(matchSafeOverride("alcool"), null);
  });
});

// ─── matchFoodContextOverride ───────────────────────────────────────────────

group("matchFoodContextOverride (food domain only)", () => {
  test("'alcool' alone → caution (defensive medical label)", () => {
    const r = matchFoodContextOverride("alcool");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });

  test("'éthanol' alone → caution", () => {
    const r = matchFoodContextOverride("éthanol");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });

  test("E330 → safe (acide citrique régulé EU)", () => {
    const r = matchFoodContextOverride("E330");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });

  test("E322 → safe (lécithine régulée EU)", () => {
    const r = matchFoodContextOverride("E322");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });

  test("acide citrique → safe", () => {
    const r = matchFoodContextOverride("acide citrique");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });

  test("lécithine de soja → safe", () => {
    const r = matchFoodContextOverride("lécithine de soja");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });

  test("'arôme naturel de fraise' → safe", () => {
    const r = matchFoodContextOverride("arôme naturel de fraise");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });

  test("gomme xanthane → safe", () => {
    const r = matchFoodContextOverride("gomme xanthane");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });

  test("ingredient unknown → null", () => {
    assert.equal(matchFoodContextOverride("sucre"), null);
  });
});

// ─── computeVerdict (GlowScore formula) ─────────────────────────────────────

group("computeVerdict (verdict + GlowScore)", () => {
  const safeMatch: MatchResult = {
    ingredientName: "x",
    matched: true,
    riskLevel: "safe",
  };
  const cautionMatch: MatchResult = {
    ingredientName: "y",
    matched: true,
    riskLevel: "caution",
  };
  const dangerMatch: MatchResult = {
    ingredientName: "z",
    matched: true,
    riskLevel: "danger",
  };
  const unknownMatch: MatchResult = {
    ingredientName: "w",
    matched: false,
    riskLevel: "no_signal",
  };

  test("all safe → verdict safe, score 100", () => {
    const r = computeVerdict([safeMatch, safeMatch, safeMatch]);
    assert.equal(r.verdict, "safe");
    assert.equal(r.glowScore, 100);
  });

  test("one danger → verdict danger, score = 50", () => {
    const r = computeVerdict([safeMatch, dangerMatch]);
    assert.equal(r.verdict, "danger");
    assert.equal(r.glowScore, 50); // 100 - 50
  });

  test("one caution → verdict caution, score = 85", () => {
    const r = computeVerdict([safeMatch, cautionMatch]);
    assert.equal(r.verdict, "caution");
    assert.equal(r.glowScore, 85); // 100 - 15
  });

  test("unknowns lower score by 2 each but don't change verdict", () => {
    const r = computeVerdict([safeMatch, unknownMatch, unknownMatch, unknownMatch]);
    assert.equal(r.verdict, "safe");
    assert.equal(r.glowScore, 94); // 100 - 3*2
  });

  test("score clamped to [0, 100]", () => {
    // 5 dangers = -250, clamped to 0
    const r = computeVerdict([
      dangerMatch,
      dangerMatch,
      dangerMatch,
      dangerMatch,
      dangerMatch,
    ]);
    assert.equal(r.glowScore, 0);
  });

  test("empty matches → verdict safe, score 100", () => {
    const r = computeVerdict([]);
    assert.equal(r.verdict, "safe");
    assert.equal(r.glowScore, 100);
  });
});

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`Tests:  ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log(`\nFailures:`);
  for (const { name, err } of failures) {
    console.log(`\n  ✗ ${name}`);
    if (err instanceof Error) {
      console.log(`    ${err.message}`);
    } else {
      console.log(`    ${String(err)}`);
    }
  }
  process.exit(1);
}
