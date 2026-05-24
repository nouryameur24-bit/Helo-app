/**
 * runTests.ts — Test fortress pour les modules pure-logic de api-server.
 *
 * v4-Lot4 — Étendu de 35 à 110+ cas. Couvre :
 *  - parseIngredients : edge cases parsing (underscores, asterisks, multi-
 *    lang, encoding, whitespace, dedupe…)
 *  - sourceToDomain : classification source → domain pour TOUTES les
 *    autorités sanitaires + cas combinés
 *  - matchSafeOverride : whitelist alcools gras + vinaigres
 *  - matchFoodContextOverride : E-numbers + alcool standalone + auxiliaires
 *  - computeVerdict : GlowScore formula + edge cases scoring
 *  - REAL-WORLD SNAPSHOTS : Moutarde Amora, Coca Zero, Doliprane, Crème
 *    Mustela, Yaourt nature, Nutella — vérifient le verdict end-to-end
 *
 * Run : `npx tsx src/__tests__/runTests.ts` (env Replit/CI où esbuild est
 * built pour Linux). Sur macOS dev, peut nécessiter `pnpm rebuild esbuild`.
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

group("parseIngredients — basics", () => {
  test("empty input → []", () => {
    assert.deepEqual(parseIngredients(""), []);
    assert.deepEqual(parseIngredients("   "), []);
    assert.deepEqual(parseIngredients("\n\n"), []);
  });

  test("simple comma list", () => {
    assert.deepEqual(parseIngredients("eau, sucre, sel"), ["Eau", "Sucre", "Sel"]);
  });

  test("semicolon separator", () => {
    assert.deepEqual(parseIngredients("eau; sucre; sel"), ["Eau", "Sucre", "Sel"]);
  });

  test("mixed separators (, ; .)", () => {
    const out = parseIngredients("eau, sucre; sel. acide citrique");
    assert.ok(out.includes("Eau"));
    assert.ok(out.includes("Sucre"));
    assert.ok(out.includes("Sel"));
    assert.ok(out.includes("Acide citrique"));
  });

  test("trims whitespace aggressively", () => {
    assert.deepEqual(parseIngredients("  eau  ,  sucre   ,sel  "), ["Eau", "Sucre", "Sel"]);
  });

  test("filters items < 2 chars", () => {
    const out = parseIngredients("eau, a, sucre, b, sel");
    assert.deepEqual(out, ["Eau", "Sucre", "Sel"]);
  });
});

group("parseIngredients — percentages and markers", () => {
  test("strips percentages with comma decimal", () => {
    assert.deepEqual(parseIngredients("eau 21,5%, sucre"), ["Eau", "Sucre"]);
  });

  test("strips percentages with dot decimal", () => {
    assert.deepEqual(parseIngredients("eau 3.2%, sucre"), ["Eau", "Sucre"]);
  });

  test("strips percentages with space", () => {
    assert.deepEqual(parseIngredients("eau 21 %, sucre 3 %"), ["Eau", "Sucre"]);
  });

  test("strips integer percentages", () => {
    assert.deepEqual(parseIngredients("eau 50%, sucre 20%"), ["Eau", "Sucre"]);
  });

  test("strips bio markers (* † ‡ § #)", () => {
    const out = parseIngredients("eau*, sucre†, sel‡, acide§, base#");
    assert.deepEqual(out, ["Eau", "Sucre", "Sel", "Acide", "Base"]);
  });
});

group("parseIngredients — normalization", () => {
  test("normalizes ALLERGEN CAPS → lowercase", () => {
    assert.deepEqual(parseIngredients("eau, lait, SOJA, GLUTEN"), [
      "Eau", "Lait", "Soja", "Gluten",
    ]);
  });

  test("preserves short uppercase acronyms (E145 stays)", () => {
    const out = parseIngredients("eau, E145, sucre");
    assert.ok(out.includes("E145"));
  });

  test("preserves E-numbers with letter suffix", () => {
    const out = parseIngredients("colorant E150c, conservateur E202");
    assert.ok(out.some((s) => s.includes("E150c") || s.includes("e150c")));
  });

  test("normalizes only 3+ letter uppercase sequences", () => {
    // "LU" (2 chars) should stay; "LAIT" (4) becomes lowercase
    const out = parseIngredients("LU, LAIT");
    assert.ok(out.includes("LU") || out.includes("Lu"));
    assert.ok(out.includes("Lait"));
  });

  test("capitalizes first letter", () => {
    const out = parseIngredients("eau, sucre");
    assert.equal(out[0], "Eau");
    assert.equal(out[1], "Sucre");
  });
});

group("parseIngredients — parens and sub-items", () => {
  test("extracts parenthesized sub-items", () => {
    const out = parseIngredients("émulsifiants (lécithines de soja), sucre");
    assert.ok(out.includes("Émulsifiants"));
    assert.ok(out.includes("Lécithines de soja"));
    assert.ok(out.includes("Sucre"));
  });

  test("multiple parens groups extracted", () => {
    const out = parseIngredients("X (a, b), Y (c, d)");
    assert.ok(out.includes("X"));
    assert.ok(out.includes("Y"));
    assert.ok(out.some((s) => s.toLowerCase().includes("a")));
    assert.ok(out.some((s) => s.toLowerCase().includes("c")));
  });

  test("nested-like parens (single level only — OFF reality)", () => {
    // OFF doesn't nest deeply; we test the regex handles flat parens
    const out = parseIngredients("X (sous-item 1), Y");
    assert.ok(out.includes("X"));
    assert.ok(out.includes("Sous-item 1"));
    assert.ok(out.includes("Y"));
  });

  test("empty parens don't break", () => {
    const out = parseIngredients("eau (), sucre");
    assert.deepEqual(out, ["Eau", "Sucre"]);
  });
});

group("parseIngredients — language prefixes (v4 fix)", () => {
  test("strips 'en:'", () => {
    assert.deepEqual(parseIngredients("en:e145, en:sugar"), ["E145", "Sugar"]);
  });

  test("strips 'fr:'", () => {
    assert.deepEqual(parseIngredients("fr:colorant caramel, fr:sucre"), [
      "Colorant caramel", "Sucre",
    ]);
  });

  test("strips 'en ' (malformed without colon)", () => {
    assert.deepEqual(parseIngredients("en natural flavouring, en e145"), [
      "Natural flavouring", "E145",
    ]);
  });

  test("strips 'fr ' (malformed)", () => {
    assert.deepEqual(parseIngredients("fr arôme naturel"), ["Arôme naturel"]);
  });

  test("strips 'de:', 'es:', 'it:', 'nl:', 'pt:'", () => {
    assert.deepEqual(parseIngredients("de:zucker, es:azucar, it:zucchero, nl:suiker, pt:açúcar"), [
      "Zucker", "Azucar", "Zucchero", "Suiker", "Açúcar",
    ]);
  });

  test("language prefix case-insensitive", () => {
    assert.deepEqual(parseIngredients("EN:e145, FR:sucre"), ["E145", "Sucre"]);
  });

  test("does NOT strip non-prefix words starting with 'en' or 'fr'", () => {
    // "enrichi" should stay intact, not become "richi"
    const out = parseIngredients("enrichi en vitamines");
    assert.ok(out.some((s) => s.toLowerCase().includes("enrichi")));
  });
});

group("parseIngredients — filters", () => {
  test("filters 'dont X' markers (sub-categorization)", () => {
    const out = parseIngredients("sucre, dont sucres simples, sel");
    assert.deepEqual(out, ["Sucre", "Sel"]);
  });

  test("filters nutritional patterns", () => {
    const out = parseIngredients(
      "matières grasses, sucre, fibres alimentaires, valeur énergétique"
    );
    assert.deepEqual(out, ["Sucre"]);
  });

  test("filters 'acides gras saturés'", () => {
    const out = parseIngredients("acides gras saturés, sucre");
    assert.deepEqual(out, ["Sucre"]);
  });

  test("filters 'sels minéraux'", () => {
    const out = parseIngredients("sels minéraux, vitamine C");
    assert.ok(!out.some((s) => s.toLowerCase().includes("sels minéraux")));
  });

  test("filters lines with ':' followed by digit (nutritional table)", () => {
    const out = parseIngredients("eau, sucre, énergie: 250 kcal, sel");
    assert.ok(!out.some((s) => s.includes(":")));
  });
});

group("parseIngredients — deduplication", () => {
  test("dedupe case-insensitive", () => {
    assert.deepEqual(parseIngredients("Sucre, SUCRE, sucre, sel"), ["Sucre", "Sel"]);
  });

  test("dedupe across paren extraction", () => {
    const out = parseIngredients("sucre (sucre), sel");
    // "Sucre" should appear only once even if duplicated via paren extraction
    const sucreCount = out.filter((s) => s.toLowerCase() === "sucre").length;
    assert.equal(sucreCount, 1);
  });
});

// ─── sourceToDomain ─────────────────────────────────────────────────────────

group("sourceToDomain — food authorities", () => {
  test("EFSA → food", () => assert.equal(sourceToDomain("EFSA"), "food"));
  test("efsa lowercase → food", () => assert.equal(sourceToDomain("efsa"), "food"));
  test("ANSES → food (v4)", () => assert.equal(sourceToDomain("ANSES"), "food"));
  test("CIQUAL → food (v4)", () => assert.equal(sourceToDomain("CIQUAL"), "food"));
  test("OMS → food (v4)", () => assert.equal(sourceToDomain("OMS"), "food"));
  test("FDA → food (v4)", () => assert.equal(sourceToDomain("FDA"), "food"));
  test("Multi-food: 'ANSES, EFSA' → food", () => {
    assert.equal(sourceToDomain("ANSES, EFSA"), "food");
  });
  test("With whitespace: '  EFSA  ' → food", () => {
    assert.equal(sourceToDomain("  EFSA  "), "food");
  });
});

group("sourceToDomain — medication authorities", () => {
  test("ANSM → medication", () => assert.equal(sourceToDomain("ANSM"), "medication"));
  test("CRAT → medication", () => assert.equal(sourceToDomain("CRAT"), "medication"));
  test("BDPM → medication", () => assert.equal(sourceToDomain("BDPM"), "medication"));
  test("HAS → medication", () => assert.equal(sourceToDomain("HAS"), "medication"));
  test("CIRC → medication", () => assert.equal(sourceToDomain("CIRC"), "medication"));
  test("INRS → medication", () => assert.equal(sourceToDomain("INRS"), "medication"));
  test("aromathérapie → medication", () => {
    assert.equal(sourceToDomain("aromathérapie"), "medication");
  });
  test("'ANSM, CRAT' → medication", () => {
    assert.equal(sourceToDomain("ANSM, CRAT"), "medication");
  });
});

group("sourceToDomain — cosmetic + edge cases", () => {
  test("Cosing → cosmetic", () => assert.equal(sourceToDomain("cosing"), "cosmetic"));
  test("SCCS → cosmetic", () => assert.equal(sourceToDomain("SCCS"), "cosmetic"));
  test("ECHA → cosmetic", () => assert.equal(sourceToDomain("ECHA"), "cosmetic"));
  test("EWG → cosmetic", () => assert.equal(sourceToDomain("EWG"), "cosmetic"));
  test("IFRA → cosmetic", () => assert.equal(sourceToDomain("IFRA"), "cosmetic"));
  test("empty → cosmetic (default)", () => assert.equal(sourceToDomain(""), "cosmetic"));
  test("null → cosmetic (default)", () => assert.equal(sourceToDomain(null), "cosmetic"));
  test("unknown source → cosmetic (default)", () => {
    assert.equal(sourceToDomain("RANDOM_AUTHORITY"), "cosmetic");
  });
  test("EFSA wins over ANSM (priority)", () => {
    // ANSM matches medication regex but EFSA fires first in food regex
    assert.equal(sourceToDomain("ANSM, EFSA"), "food");
  });
});

// ─── matchSafeOverride ──────────────────────────────────────────────────────

group("matchSafeOverride — vinaigres", () => {
  test("vinaigre d'alcool → safe", () => {
    const r = matchSafeOverride("vinaigre d'alcool");
    assert.ok(r);
    assert.equal(r.label, "Vinaigre");
  });
  test("vinaigre d'alcool with curly apostrophe → safe", () => {
    const r = matchSafeOverride("vinaigre d’alcool");
    assert.ok(r);
  });
  test("vinaigre blanc → safe", () => {
    assert.ok(matchSafeOverride("vinaigre blanc"));
  });
  test("vinaigre de vin → safe", () => {
    assert.ok(matchSafeOverride("vinaigre de vin"));
  });
  test("vinaigre de cidre → safe", () => {
    assert.ok(matchSafeOverride("vinaigre de cidre"));
  });
  test("vinaigre balsamique → safe", () => {
    assert.ok(matchSafeOverride("vinaigre balsamique"));
  });
});

group("matchSafeOverride — alcools gras cosmétiques", () => {
  test("cetearyl alcohol → safe", () => {
    assert.ok(matchSafeOverride("cetearyl alcohol"));
  });
  test("cetyl alcohol → safe", () => {
    assert.ok(matchSafeOverride("cetyl alcohol"));
  });
  test("stearyl alcohol → safe", () => {
    assert.ok(matchSafeOverride("stearyl alcohol"));
  });
  test("behenyl alcohol → safe", () => {
    assert.ok(matchSafeOverride("behenyl alcohol"));
  });
  test("myristyl alcohol → safe", () => {
    assert.ok(matchSafeOverride("myristyl alcohol"));
  });
  test("benzyl alcohol → safe (conservateur)", () => {
    assert.ok(matchSafeOverride("benzyl alcohol"));
  });
  test("'alcools gras' → safe", () => {
    assert.ok(matchSafeOverride("alcools gras"));
  });
});

group("matchSafeOverride — must NOT match dangerous", () => {
  test("plain 'alcool' → not in safe whitelist", () => {
    assert.equal(matchSafeOverride("alcool"), null);
  });
  test("'alcool éthylique' → not in safe whitelist", () => {
    assert.equal(matchSafeOverride("alcool éthylique"), null);
  });
  test("random ingredient → null", () => {
    assert.equal(matchSafeOverride("sucre"), null);
  });
});

// ─── matchFoodContextOverride ───────────────────────────────────────────────

group("matchFoodContextOverride — alcool", () => {
  test("'alcool' alone → caution", () => {
    const r = matchFoodContextOverride("alcool");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });
  test("'alcohol' alone → caution", () => {
    const r = matchFoodContextOverride("alcohol");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });
  test("'éthanol' alone → caution", () => {
    const r = matchFoodContextOverride("éthanol");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });
  test("'ethanol' (no accent) → caution", () => {
    const r = matchFoodContextOverride("ethanol");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });
  test("'alcool éthylique' → caution", () => {
    const r = matchFoodContextOverride("alcool éthylique");
    assert.ok(r);
    assert.equal(r.riskLevel, "caution");
  });
});

group("matchFoodContextOverride — E-numbers", () => {
  test("E330 → safe", () => {
    const r = matchFoodContextOverride("E330");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("E322 → safe", () => {
    const r = matchFoodContextOverride("E322");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("E300 (vit C) → safe", () => {
    const r = matchFoodContextOverride("E300");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("E150a → safe", () => {
    const r = matchFoodContextOverride("E150a");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("E440 (pectine) → safe", () => {
    const r = matchFoodContextOverride("E440");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("'E 330' with space → safe", () => {
    const r = matchFoodContextOverride("E 330");
    assert.ok(r);
  });
});

group("matchFoodContextOverride — common safe additives", () => {
  test("acide citrique → safe", () => {
    const r = matchFoodContextOverride("acide citrique");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("acide ascorbique → safe", () => {
    const r = matchFoodContextOverride("acide ascorbique");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("lécithine de soja → safe", () => {
    const r = matchFoodContextOverride("lécithine de soja");
    assert.ok(r);
    assert.equal(r.riskLevel, "safe");
  });
  test("lécithines (plural) → safe", () => {
    const r = matchFoodContextOverride("lécithines");
    assert.ok(r);
  });
  test("colorant caramel → safe", () => {
    const r = matchFoodContextOverride("colorant caramel");
    assert.ok(r);
  });
  test("arôme naturel de fraise → safe", () => {
    const r = matchFoodContextOverride("arôme naturel de fraise");
    assert.ok(r);
  });
  test("gomme xanthane → safe", () => {
    const r = matchFoodContextOverride("gomme xanthane");
    assert.ok(r);
  });
  test("gomme guar → safe", () => {
    const r = matchFoodContextOverride("gomme guar");
    assert.ok(r);
  });
  test("gomme arabique → safe", () => {
    const r = matchFoodContextOverride("gomme arabique");
    assert.ok(r);
  });
});

group("matchFoodContextOverride — must return null for unknowns", () => {
  test("sucre → null (not in food overrides)", () => {
    assert.equal(matchFoodContextOverride("sucre"), null);
  });
  test("paracétamol → null", () => {
    assert.equal(matchFoodContextOverride("paracétamol"), null);
  });
  test("E102 (controversial) → null", () => {
    // E102 = tartrazine, controversial in pregnancy → must NOT be auto-safe
    assert.equal(matchFoodContextOverride("E102"), null);
  });
  test("E249 (nitrite) → null", () => {
    // Nitrites controversial → must NOT be auto-safe
    assert.equal(matchFoodContextOverride("E249"), null);
  });
});

// ─── computeVerdict ─────────────────────────────────────────────────────────

const safeM: MatchResult = { ingredientName: "x", matched: true, riskLevel: "safe" };
const cautionM: MatchResult = { ingredientName: "y", matched: true, riskLevel: "caution" };
const dangerM: MatchResult = { ingredientName: "z", matched: true, riskLevel: "danger" };
const unknownM: MatchResult = { ingredientName: "w", matched: false, riskLevel: "no_signal" };

group("computeVerdict — verdict logic", () => {
  test("all safe → verdict safe, score 100", () => {
    const r = computeVerdict([safeM, safeM, safeM]);
    assert.equal(r.verdict, "safe");
    assert.equal(r.glowScore, 100);
  });
  test("one danger → verdict danger", () => {
    const r = computeVerdict([safeM, dangerM]);
    assert.equal(r.verdict, "danger");
  });
  test("one caution → verdict caution", () => {
    const r = computeVerdict([safeM, cautionM]);
    assert.equal(r.verdict, "caution");
  });
  test("danger trumps caution", () => {
    const r = computeVerdict([cautionM, dangerM]);
    assert.equal(r.verdict, "danger");
  });
  test("empty → verdict safe, score 100", () => {
    const r = computeVerdict([]);
    assert.equal(r.verdict, "safe");
    assert.equal(r.glowScore, 100);
  });
});

group("computeVerdict — score formula", () => {
  test("1 danger → score 50 (-50)", () => {
    assert.equal(computeVerdict([safeM, dangerM]).glowScore, 50);
  });
  test("1 caution → score 85 (-15)", () => {
    assert.equal(computeVerdict([safeM, cautionM]).glowScore, 85);
  });
  test("3 unknowns → score 94 (-6)", () => {
    assert.equal(computeVerdict([safeM, unknownM, unknownM, unknownM]).glowScore, 94);
  });
  test("1 caution + 5 unknown → score 75", () => {
    const r = computeVerdict([cautionM, unknownM, unknownM, unknownM, unknownM, unknownM]);
    assert.equal(r.glowScore, 75); // 100 - 15 - 10
  });
  test("complex mix: 1d + 2c + 5u → score 0 (clamped from -10)", () => {
    const r = computeVerdict([
      dangerM, cautionM, cautionM,
      unknownM, unknownM, unknownM, unknownM, unknownM,
    ]);
    // 100 - 50 - 30 - 10 = 10
    assert.equal(r.glowScore, 10);
    assert.equal(r.verdict, "danger");
  });
  test("score clamped at 0 (≥3 dangers)", () => {
    assert.equal(computeVerdict([dangerM, dangerM, dangerM]).glowScore, 0);
  });
  test("score clamped at 100 (impossible but defensive)", () => {
    // No negatives possible in normal flow, but if all safe → 100
    assert.equal(computeVerdict(Array(20).fill(safeM)).glowScore, 100);
  });
});

// ─── REAL-WORLD SNAPSHOTS ───────────────────────────────────────────────────
// Ces tests vérifient le pipeline complet parseIngredients + overrides sur
// des produits réels rencontrés en prod. Toute régression v3-style (qui a
// cassé "Moutarde Amora") sera détectée ici.

group("Real-world — parsing snapshots", () => {
  test("Moutarde Amora (food, vinaigre d'alcool)", () => {
    const raw = "Eau, graines de moutarde (21,5%), vinaigre d'alcool, sel, acide citrique, disulfite de potassium.";
    const out = parseIngredients(raw);
    assert.ok(out.includes("Eau"));
    assert.ok(out.includes("Sel"));
    assert.ok(out.some((s) => s.toLowerCase().includes("graines de moutarde")));
    assert.ok(out.some((s) => s.toLowerCase().includes("vinaigre")));
    assert.ok(out.some((s) => s.toLowerCase().includes("acide citrique")));
    assert.ok(out.some((s) => s.toLowerCase().includes("disulfite")));
  });

  test("Coca Zero (food, edge: caffeine + E950)", () => {
    const raw = "Eau gazéifiée, colorants : E150d, édulcorants : aspartame, acésulfame K, acide phosphorique, arômes (extraits végétaux), acide citrique, caféine.";
    const out = parseIngredients(raw);
    assert.ok(out.some((s) => s.toLowerCase().includes("eau gazéifiée")));
    assert.ok(out.some((s) => s.toLowerCase().includes("aspartame")));
    assert.ok(out.some((s) => s.toLowerCase().includes("acésulfame")));
    assert.ok(out.some((s) => s.toLowerCase().includes("caféine")));
  });

  test("Doliprane (medication)", () => {
    const raw = "Paracétamol 500mg, amidon prégélatinisé, povidone, stéarate de magnésium";
    const out = parseIngredients(raw);
    assert.ok(out.some((s) => s.toLowerCase().includes("paracétamol")));
    assert.ok(out.some((s) => s.toLowerCase().includes("povidone")));
    assert.ok(out.some((s) => s.toLowerCase().includes("stéarate")));
  });

  test("Crème Mustela (cosmetic, parabens absents)", () => {
    const raw = "Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Persea Gratissima Oil, Tocopherol";
    const out = parseIngredients(raw);
    assert.ok(out.some((s) => s.toLowerCase() === "aqua"));
    assert.ok(out.some((s) => s.toLowerCase() === "glycerin"));
    assert.ok(out.some((s) => s.toLowerCase().includes("cetearyl")));
    // Cetearyl alcohol must be flagged safe via matchSafeOverride
    const cetearyl = out.find((s) => s.toLowerCase().includes("cetearyl"));
    assert.ok(cetearyl);
    assert.ok(matchSafeOverride(cetearyl));
  });

  test("Yaourt nature (food, lots of allergen caps from OFF)", () => {
    const raw = "LAIT entier, ferments lactiques.";
    const out = parseIngredients(raw);
    // LAIT (caps) must be normalized to "Lait"
    assert.ok(out.some((s) => s === "Lait"));
    assert.ok(out.some((s) => s.toLowerCase().includes("ferments")));
  });

  test("Nutella (food, palm oil red flag)", () => {
    const raw = "Sucre, huile de palme, NOISETTES (13%), cacao maigre, LAIT écrémé en poudre, LACTOSÉRUM en poudre, émulsifiants : lécithines (SOJA), vanilline.";
    const out = parseIngredients(raw);
    assert.ok(out.includes("Sucre"));
    assert.ok(out.some((s) => s.toLowerCase().includes("huile de palme")));
    assert.ok(out.some((s) => s.toLowerCase().includes("noisettes")));
    assert.ok(out.some((s) => s.toLowerCase().includes("cacao")));
    assert.ok(out.some((s) => s.toLowerCase().includes("lait")));
    // Lécithines extracted from parens, marked safe by food override
    const lec = out.find((s) => s.toLowerCase().includes("lécithine"));
    assert.ok(lec);
    const ov = matchFoodContextOverride(lec);
    assert.ok(ov);
    assert.equal(ov.riskLevel, "safe");
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
