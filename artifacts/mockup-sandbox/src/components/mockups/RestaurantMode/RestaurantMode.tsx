import { useState } from 'react';

const accent = '#C9A96E';
const bg = '#FFFAF5';
const dark = '#2D2926';
const safe = '#4CAF85';
const caution = '#E8A838';
const danger = '#E05454';
const textSec = '#7A6F67';
const textTer = '#B8AFA8';
const cardBg = '#FFFFFF';

const MOCK_ANALYSIS = {
  dishes: [
    {
      name: 'Tartare de saumon, avocat, citron vert',
      course: 'entrée',
      risk: 'danger' as const,
      reasons: ['Poisson cru : risque de listériose et parasites', 'Déconseillé pendant toute la grossesse'],
      questions: ['Le saumon est-il surgelé avant d\'être servi ? (neutralise les parasites)', 'Peut-on le proposer en version saumon mi-cuit ?'],
    },
    {
      name: 'Velouté de butternut, crème fraîche',
      course: 'entrée',
      risk: 'safe' as const,
      reasons: [],
      questions: [],
    },
    {
      name: 'Œuf mollet, salade de lentilles, lardons',
      course: 'entrée',
      risk: 'caution' as const,
      reasons: ['Œuf mollet : blanc et jaune pas entièrement cuits'],
      questions: ['Pouvez-vous cuire l\'œuf à la place en œuf dur ?'],
    },
    {
      name: 'Filet de bœuf, jus de truffe, pommes dauphine',
      course: 'plat',
      risk: 'caution' as const,
      reasons: ['Viande rouge — cuisson à préciser (bien cuit obligatoire)'],
      questions: ['Pouvez-vous cuire le filet bien cuit (pas de rosé) ?'],
    },
    {
      name: 'Suprême de volaille, morilles à la crème',
      course: 'plat',
      risk: 'safe' as const,
      reasons: [],
      questions: [],
    },
    {
      name: 'Risotto aux cèpes, parmesan',
      course: 'plat',
      risk: 'safe' as const,
      reasons: [],
      questions: [],
    },
    {
      name: 'Sashimi de thon rouge',
      course: 'plat',
      risk: 'danger' as const,
      reasons: ['Poisson cru : risque de listériose', 'Thon rouge : teneur élevée en mercure'],
      questions: [],
    },
    {
      name: 'Mousse au chocolat noir',
      course: 'dessert',
      risk: 'caution' as const,
      reasons: ['Blancs d\'œufs non pasteurisés possibles'],
      questions: ['La mousse contient-elle des œufs crus non pasteurisés ?'],
    },
    {
      name: 'Tarte tatin aux pommes, glace vanille',
      course: 'dessert',
      risk: 'safe' as const,
      reasons: [],
      questions: [],
    },
    {
      name: 'Eau pétillante San Pellegrino',
      course: 'boisson',
      risk: 'safe' as const,
      reasons: [],
      questions: [],
    },
    {
      name: 'Jus de fruits frais pressés',
      course: 'boisson',
      risk: 'safe' as const,
      reasons: [],
      questions: [],
    },
  ],
};

const RISK_COLORS = { safe, caution, danger };
const RISK_LABELS = { safe: 'Compatible', caution: 'À vérifier', danger: 'Déconseillé' };
const RISK_ICONS = { safe: '✓', caution: '⚠', danger: '✕' };

type Risk = 'safe' | 'caution' | 'danger';
type Course = 'entrée' | 'plat' | 'dessert' | 'boisson';
type Tab = 'tous' | Course;

const TABS: { key: Tab; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'entrée', label: 'Entrées' },
  { key: 'plat', label: 'Plats' },
  { key: 'dessert', label: 'Desserts' },
  { key: 'boisson', label: 'Boissons' },
];

function DishCard({ dish }: { dish: typeof MOCK_ANALYSIS.dishes[0] }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = dish.reasons.length > 0 || dish.questions.length > 0;
  const color = RISK_COLORS[dish.risk];

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 10,
        boxShadow: '0 1px 6px rgba(45,41,38,0.06)',
        cursor: hasDetail ? 'pointer' : 'default',
      }}
      onClick={() => hasDetail && setExpanded(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
          <span style={{ color, fontSize: 14, marginTop: 1, fontWeight: 700 }}>{RISK_ICONS[dish.risk]}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: dark, lineHeight: 1.4 }}>{dish.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color,
            background: color + '22',
            border: `1px solid ${color}55`,
            borderRadius: 20,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}>
            {RISK_LABELS[dish.risk]}
          </span>
          {hasDetail && (
            <span style={{ color: textTer, fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {expanded && hasDetail && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${bg}`, paddingTop: 10 }}>
          {dish.reasons.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <span style={{ color: accent, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 12, color: textSec, lineHeight: 1.5 }}>{r}</span>
            </div>
          ))}
          {dish.questions.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: textTer, letterSpacing: 1, marginBottom: 6 }}>
                QUESTIONS POUR LE SERVEUR
              </div>
              {dish.questions.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: bg, borderRadius: 8, padding: '7px 10px', marginBottom: 4, gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: textSec, flex: 1, lineHeight: 1.4 }}>{q}</span>
                  <span style={{ fontSize: 11, color: accent }}>⎘</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RestaurantMode() {
  const [activeTab, setActiveTab] = useState<Tab>('tous');
  const dishes = MOCK_ANALYSIS.dishes;

  const safeCount = dishes.filter(d => d.risk === 'safe').length;
  const cautionCount = dishes.filter(d => d.risk === 'caution').length;
  const dangerCount = dishes.filter(d => d.risk === 'danger').length;

  const tabCounts: Record<Tab, number> = {
    tous: dishes.length,
    entrée: dishes.filter(d => d.course === 'entrée').length,
    plat: dishes.filter(d => d.course === 'plat').length,
    dessert: dishes.filter(d => d.course === 'dessert').length,
    boisson: dishes.filter(d => d.course === 'boisson').length,
  };

  const filtered = activeTab === 'tous' ? dishes : dishes.filter(d => d.course === activeTab);
  const safeDishes = dishes.filter(d => d.risk === 'safe');
  const allQuestions = [...new Set(dishes.flatMap(d => d.questions))];

  return (
    <div style={{
      background: bg,
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      maxWidth: 390,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 14px',
        background: bg,
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: `1px solid ${accent}22`,
      }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: dark, padding: 4 }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: dark }}>Menu analysé</span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: accent, padding: 4 }}>⬆</button>
      </div>

      <div style={{ padding: '0 16px 80px' }}>
        {/* Summary card */}
        <div style={{
          background: `linear-gradient(135deg, ${dark} 0%, #3d3530 100%)`,
          borderRadius: 20,
          padding: '20px 24px',
          marginTop: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#FFFAF5', marginBottom: 14 }}>
            {dishes.length} plats détectés
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[
              { count: safeCount, color: safe, label: 'Compatibles' },
              { count: cautionCount, color: caution, label: 'À vérifier' },
              { count: dangerCount, color: danger, label: 'Déconseillés' },
            ].map(({ count, color, label }, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                {i > 0 && (
                  <div style={{ position: 'absolute', width: 1, height: 32, background: '#FFFFFF20', transform: 'translateX(-50%)' }} />
                )}
                <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
                <div style={{ fontSize: 11, color: '#FFFAF580', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 14 }}>
          {TABS.filter(t => t.key === 'tous' || tabCounts[t.key] > 0).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                background: activeTab === tab.key ? dark : '#FFFAF5',
                color: activeTab === tab.key ? '#FFFAF5' : textSec,
                boxShadow: activeTab === tab.key ? 'none' : '0 1px 4px rgba(45,41,38,0.1)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}{tab.key !== 'tous' ? ` (${tabCounts[tab.key]})` : ''}
            </button>
          ))}
        </div>

        {/* Dish list */}
        <div style={{ marginBottom: 8 }}>
          {filtered.map((dish, i) => <DishCard key={i} dish={dish} />)}
        </div>

        {/* Commander sereinement */}
        {safeDishes.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <span style={{ color: safe, fontSize: 15 }}>✓</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: dark }}>Commander sereinement</span>
            </div>
            <div style={{
              background: cardBg,
              borderRadius: 16,
              border: `1px solid ${safe}44`,
              padding: '14px 16px',
              boxShadow: '0 1px 6px rgba(45,41,38,0.06)',
            }}>
              {safeDishes.map((d, i) => (
                <div key={d.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                    <span style={{ color: safe, fontSize: 12, fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: 14, color: dark }}>{d.name}</span>
                  </div>
                  {i < safeDishes.length - 1 && (
                    <div style={{ height: 1, background: bg, margin: '2px 0' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions pour le serveur */}
        {allQuestions.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ color: accent, fontSize: 15 }}>💬</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: dark }}>Questions pour le serveur</span>
            </div>
            <div style={{ fontSize: 12, color: textTer, marginBottom: 10 }}>
              Appuyez pour copier et montrer au serveur
            </div>
            {allQuestions.map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: cardBg, borderRadius: 14, padding: '12px 14px', marginBottom: 8,
                boxShadow: '0 1px 6px rgba(45,41,38,0.06)', cursor: 'pointer', gap: 10,
              }}>
                <span style={{ fontSize: 13, color: dark, flex: 1, lineHeight: 1.5 }}>{q}</span>
                <span style={{ color: accent, fontSize: 14, flexShrink: 0 }}>⎘</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          marginTop: 28,
          borderTop: `1px solid ${accent}22`,
          paddingTop: 16,
        }}>
          <p style={{ fontSize: 11, color: textTer, lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
            Cette analyse est indicative et basée sur la reconnaissance de texte. Les compositions exactes des plats peuvent varier. Consultez toujours votre médecin ou sage-femme pour des conseils personnalisés.
          </p>
        </div>
      </div>
    </div>
  );
}
