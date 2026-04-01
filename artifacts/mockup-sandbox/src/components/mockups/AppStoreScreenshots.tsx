import React from 'react';

const GOLD = '#C9A96E';
const CREAM = '#FFFAF5';
const DARK = '#2D2926';
const MUTED = '#8B7B6B';
const GREEN = '#4CAF50';
const RED = '#E53935';
const ORANGE = '#F5A623';

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#F0EBE3',
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 48,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: DARK,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 40,
  },
  row: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};

// ─── Phone Frame ────────────────────────────────────────────────────────────
function PhoneFrame({ children, bg = CREAM }: { children: React.ReactNode; bg?: string }) {
  return (
    <div style={{
      width: 300,
      height: 649,
      background: bg,
      borderRadius: 40,
      border: '8px solid #1A1A1A',
      boxShadow: '0 30px 80px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 90, height: 26, background: '#111', borderRadius: 13, zIndex: 10,
      }} />
      {children}
    </div>
  );
}

// ─── Outer Screenshot Wrapper ────────────────────────────────────────────────
function Screenshot({
  bg,
  headline,
  subtitle,
  number,
  children,
}: {
  bg: string;
  headline: string;
  subtitle: string;
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      width: 340,
      background: bg,
      borderRadius: 24,
      padding: '32px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    }}>
      {/* Hēlo logo top-left */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: GOLD, letterSpacing: 1 }}>Hēlo</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '3px 10px' }}>
          {number} / 5
        </span>
      </div>

      {/* Phone */}
      <PhoneFrame>{children}</PhoneFrame>

      {/* Text */}
      <div style={{ textAlign: 'center', padding: '0 8px' }}>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: 8,
          fontFamily: 'Georgia, serif',
        }}>{headline}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{subtitle}</div>
      </div>

      {/* Bottom badge */}
      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'center',
        letterSpacing: 0.3,
      }}>
        4 962 ingrédients vérifiés · Sources CRAT, ANSM, OMS
      </div>
    </div>
  );
}

// ─── Screenshot 1 — HERO (Scanner) ──────────────────────────────────────────
function Screenshot1() {
  return (
    <Screenshot
      bg="linear-gradient(160deg, #2D2926 0%, #4A3728 100%)"
      headline="Scannez. Vérifiez. Respirez."
      subtitle="Cosmétiques, alimentation, médicaments — vérifiés pour votre grossesse"
      number={1}
    >
      <div style={{ width: '100%', height: '100%', background: '#1C1C1E', display: 'flex', flexDirection: 'column', paddingTop: 52 }}>
        {/* Header */}
        <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Scanner</div>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔦</div>
        </div>

        {/* Trimester pill */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ background: '#2C2C2E', borderRadius: 20, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: GOLD }} />
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>2ème trimestre · S24</span>
          </div>
        </div>

        {/* Viewfinder */}
        <div style={{
          margin: '0 20px',
          flex: 1,
          background: '#000',
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Scan frame corners */}
          {[
            { top: 30, left: 30 },
            { top: 30, right: 30 },
            { bottom: 30, left: 30 },
            { bottom: 30, right: 30 },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', ...pos,
              width: 28, height: 28,
              borderTop: i < 2 ? `3px solid ${GOLD}` : 'none',
              borderBottom: i >= 2 ? `3px solid ${GOLD}` : 'none',
              borderLeft: i % 2 === 0 ? `3px solid ${GOLD}` : 'none',
              borderRight: i % 2 === 1 ? `3px solid ${GOLD}` : 'none',
            }} />
          ))}
          {/* Scan line */}
          <div style={{
            position: 'absolute', top: '45%', left: 30, right: 30,
            height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            boxShadow: `0 0 8px ${GOLD}`,
          }} />
          {/* Barcode mock */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'stretch', height: 60 }}>
            {[4,2,6,2,5,3,7,2,4,6,3,5,2,7,3].map((w, i) => (
              <div key={i} style={{ width: w, background: '#fff', opacity: 0.9 }} />
            ))}
          </div>
          {/* Hint */}
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Centrez le code-barres
          </div>
        </div>

        {/* Bottom modes */}
        <div style={{ padding: '12px 20px', display: 'flex', gap: 8, justifyContent: 'center' }}>
          {['📷 Scan', '🔍 Texte', '🍽 Menu', '💊 Ordo'].map((m, i) => (
            <div key={i} style={{
              fontSize: 10, color: i === 0 ? GOLD : 'rgba(255,255,255,0.4)',
              background: i === 0 ? 'rgba(201,169,110,0.15)' : 'transparent',
              padding: '5px 10px', borderRadius: 12, fontWeight: i === 0 ? 700 : 400,
            }}>{m}</div>
          ))}
        </div>
      </div>
    </Screenshot>
  );
}

// ─── Screenshot 2 — VERDICT ──────────────────────────────────────────────────
function Screenshot2() {
  return (
    <Screenshot
      bg="linear-gradient(160deg, #1B3A2F 0%, #2D5241 100%)"
      headline="Un verdict clair en 2 secondes"
      subtitle="Adapté à votre trimestre. Sources médicales affichées."
      number={2}
    >
      <div style={{ width: '100%', height: '100%', background: CREAM, display: 'flex', flexDirection: 'column', paddingTop: 52 }}>
        {/* Header */}
        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: MUTED }}>←</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>Résultat du scan</div>
        </div>

        {/* Product card */}
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, background: '#f5f5f5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🧴</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>Crème hydratante Avène</div>
              <div style={{ fontSize: 11, color: MUTED }}>Avène · Soin visage</div>
            </div>
          </div>
        </div>

        {/* VERDICT badge */}
        <div style={{ padding: '0 16px', marginBottom: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
            borderRadius: 20, padding: '18px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            border: '1.5px solid #A5D6A7',
          }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1B5E20' }}>Compatible</div>
            <div style={{ fontSize: 11, color: '#2E7D32', textAlign: 'center' }}>Tous les ingrédients sont sûrs pour votre 2ème trimestre</div>
          </div>
        </div>

        {/* Ingredients */}
        <div style={{ padding: '0 16px', flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8, letterSpacing: 0.5 }}>INGRÉDIENTS ANALYSÉS</div>
          {[
            { name: 'Aqua', verdict: '✅', color: '#4CAF50' },
            { name: 'Glycerin', verdict: '✅', color: '#4CAF50' },
            { name: 'Squalane', verdict: '✅', color: '#4CAF50' },
            { name: 'Tocopherol (Vit. E)', verdict: '✅', color: '#4CAF50' },
            { name: 'Xanthan Gum', verdict: '✅', color: '#4CAF50' },
          ].map((ing, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid #f0f0f0',
            }}>
              <span style={{ fontSize: 12, color: DARK }}>{ing.name}</span>
              <span style={{ fontSize: 12 }}>{ing.verdict}</span>
            </div>
          ))}
        </div>

        {/* Source */}
        <div style={{ padding: '8px 16px', background: '#F8F4EF', borderTop: '1px solid #EDE8E0' }}>
          <div style={{ fontSize: 10, color: MUTED }}>Source : CRAT · ANSM 2024 · EFSA</div>
        </div>
      </div>
    </Screenshot>
  );
}

// ─── Screenshot 3 — RESTAURANT ───────────────────────────────────────────────
function Screenshot3() {
  return (
    <Screenshot
      bg="linear-gradient(160deg, #3D2314 0%, #6B3A20 100%)"
      headline="Le Mode Restaurant"
      subtitle="Photographiez le menu. Commandez sereinement."
      number={3}
    >
      <div style={{ width: '100%', height: '100%', background: CREAM, display: 'flex', flexDirection: 'column', paddingTop: 52 }}>
        {/* Header */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>Mode Restaurant 🍽</div>
          <div style={{ fontSize: 11, color: MUTED }}>Analyse IA de votre menu</div>
        </div>

        {/* Menu photo preview */}
        <div style={{ margin: '0 16px 12px', height: 90, background: '#2C2C2E', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>📸 Photo du menu analysée</div>
          <div style={{ position: 'absolute', top: 8, right: 8, background: GOLD, borderRadius: 8, padding: '2px 8px', fontSize: 9, color: '#fff', fontWeight: 700 }}>IA</div>
        </div>

        {/* Dishes */}
        <div style={{ padding: '0 16px', flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8, letterSpacing: 0.5 }}>PLATS ANALYSÉS</div>
          {[
            { name: 'Saumon fumé à froid', risk: 'danger', emoji: '❌', note: 'Listéria — éviter' },
            { name: 'Risotto aux champignons', risk: 'safe', emoji: '✅', note: 'Parfaitement sûr' },
            { name: 'Carpaccio de bœuf', risk: 'danger', emoji: '❌', note: 'Viande crue — éviter' },
            { name: 'Filet de bar grillé', risk: 'safe', emoji: '✅', note: 'Poisson cuit, mercure OK' },
            { name: 'Fondant au chocolat', risk: 'caution', emoji: '⚠️', note: 'Caféine — 1 portion max' },
          ].map((dish, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 0', borderBottom: '1px solid #f0f0f0',
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{dish.emoji}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: DARK }}>{dish.name}</div>
                <div style={{ fontSize: 10, color: dish.risk === 'danger' ? RED : dish.risk === 'caution' ? ORANGE : '#388E3C' }}>{dish.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '10px 16px' }}>
          <div style={{ background: GOLD, borderRadius: 14, padding: '12px', textAlign: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>
            Voir les questions à poser au serveur →
          </div>
        </div>
      </div>
    </Screenshot>
  );
}

// ─── Screenshot 4 — GLOW SCORE ───────────────────────────────────────────────
function Screenshot4() {
  const score = 87;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Screenshot
      bg="linear-gradient(160deg, #3B2960 0%, #6B4FA0 100%)"
      headline="Votre Glow Score"
      subtitle="Suivez la qualité de vos produits semaine après semaine."
      number={4}
    >
      <div style={{ width: '100%', height: '100%', background: CREAM, display: 'flex', flexDirection: 'column', paddingTop: 52 }}>
        {/* Header */}
        <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>Bonjour, Sophie ✨</div>
            <div style={{ fontSize: 11, color: MUTED }}>Semaine 24 · 2ème trimestre</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#E8E0D5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
        </div>

        {/* Glow Score ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 16px' }}>
          <div style={{ position: 'relative', width: 130, height: 130 }}>
            <svg width={130} height={130} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={65} cy={65} r={radius} fill="none" stroke="#EDE8E0" strokeWidth={10} />
              <circle
                cx={65} cy={65} r={radius} fill="none"
                stroke={GOLD} strokeWidth={10}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: DARK }}>{score}</div>
              <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, letterSpacing: 0.5 }}>GLOW SCORE</div>
            </div>
          </div>
          <div style={{ marginTop: 8, background: '#E8F5E9', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: '#2E7D32', fontWeight: 600 }}>
            +4 pts cette semaine 🌿
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ padding: '0 16px', display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Produits', value: '23', icon: '📦' },
            { label: 'Sûrs', value: '19', icon: '✅' },
            { label: 'Précaution', value: '4', icon: '⚠️' },
          ].map((stat, i) => (
            <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '10px 8px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 16 }}>{stat.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>{stat.value}</div>
              <div style={{ fontSize: 9, color: MUTED }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent scans */}
        <div style={{ padding: '0 16px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8, letterSpacing: 0.5 }}>SCANS RÉCENTS</div>
          {[
            { name: 'Crème Avène Pédiatril', emoji: '🧴', ok: true },
            { name: 'Jus de cranberry Ocean Spray', emoji: '🍹', ok: true },
            { name: 'Doliprane 1000mg', emoji: '💊', ok: false },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span style={{ flex: 1, fontSize: 12, color: DARK }}>{item.name}</span>
              <span style={{ fontSize: 12 }}>{item.ok ? '✅' : '⚠️'}</span>
            </div>
          ))}
        </div>
      </div>
    </Screenshot>
  );
}

// ─── Screenshot 5 — CHATBOT ──────────────────────────────────────────────────
function Screenshot5() {
  return (
    <Screenshot
      bg="linear-gradient(160deg, #1A3A4A 0%, #2A6080 100%)"
      headline="Votre Sage‑Femme IA"
      subtitle="Posez n'importe quelle question. Réponse sourcée instantanée."
      number={5}
    >
      <div style={{ width: '100%', height: '100%', background: CREAM, display: 'flex', flexDirection: 'column', paddingTop: 52 }}>
        {/* Header */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid #EDE8E0' }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg, ${GOLD}, #E8C88A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤱</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>Sage‑Femme IA</div>
            <div style={{ fontSize: 10, color: '#4CAF50' }}>● En ligne</div>
          </div>
        </div>

        {/* Chat messages */}
        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          {/* Bot welcome */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: `linear-gradient(135deg, ${GOLD}, #E8C88A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤱</div>
            <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '10px 12px', maxWidth: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, color: DARK, lineHeight: 1.5 }}>Bonjour Sophie ! Je suis là pour répondre à toutes vos questions sur votre grossesse. 🌸</div>
            </div>
          </div>

          {/* User question */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: GOLD, borderRadius: '16px 16px 4px 16px', padding: '10px 12px', maxWidth: 190 }}>
              <div style={{ fontSize: 11, color: '#fff', lineHeight: 1.5 }}>Puis-je prendre du Doliprane pendant ma grossesse ?</div>
            </div>
          </div>

          {/* Bot answer */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: `linear-gradient(135deg, ${GOLD}, #E8C88A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤱</div>
            <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '10px 12px', maxWidth: 190, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, color: DARK, lineHeight: 1.5 }}>
                ✅ <strong>Oui, le paracétamol (Doliprane)</strong> est l'antidouleur de référence pendant la grossesse, à la dose minimale efficace et sur courte durée.
                <br /><br />
                <span style={{ color: MUTED, fontSize: 10 }}>Source : CRAT · ANSM 2024</span>
              </div>
            </div>
          </div>

          {/* Typing indicator */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: `linear-gradient(135deg, ${GOLD}, #E8C88A)`, flexShrink: 0 }} />
            <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: '#ccc' }} />)}
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: '10px 16px', background: '#fff', borderTop: '1px solid #EDE8E0', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: '#F5F0EB', borderRadius: 20, padding: '10px 14px', fontSize: 11, color: MUTED }}>
            Poser une question…
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>→</div>
        </div>
      </div>
    </Screenshot>
  );
}

// ─── Main Gallery ────────────────────────────────────────────────────────────
export default function AppStoreScreenshots() {
  return (
    <div style={styles.page}>
      <div style={{ textAlign: 'center' }}>
        <div style={styles.pageTitle}>Hēlo — App Store Screenshots</div>
        <div style={styles.pageSubtitle}>5 screenshots · Format iPhone 6.9" (1290×2796)</div>
      </div>

      <div style={styles.row}>
        {[Screenshot1, Screenshot2, Screenshot3].map((Comp, i) => (
          <div key={i} style={styles.card}>
            <div style={styles.label}>{['01 — Scanner', '02 — Verdict', '03 — Restaurant'][i]}</div>
            <Comp />
          </div>
        ))}
      </div>

      <div style={styles.row}>
        {[Screenshot4, Screenshot5].map((Comp, i) => (
          <div key={i} style={styles.card}>
            <div style={styles.label}>{['04 — Glow Score', '05 — Sage-Femme IA'][i]}</div>
            <Comp />
          </div>
        ))}
      </div>
    </div>
  );
}
