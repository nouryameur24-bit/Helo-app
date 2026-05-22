import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import type { JournalEntry } from '@/app/journal';
import { STORAGE_KEYS } from '@/lib/storageKeys';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildCoverPage(firstName: string | null | undefined, glowScore: number): string {
  return `
    <div class="cover">
      <div class="cover-logo">Hēlo</div>
      <div class="cover-title">Mon Journal de Grossesse</div>
      ${firstName ? `<div class="cover-name">${escapeHtml(firstName)}</div>` : ''}
      <div class="cover-date">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="glow-score">
        <div class="glow-label">Glow Score</div>
        <div class="glow-value">${glowScore}</div>
      </div>
    </div>
  `;
}

function buildEntriesHtml(entries: JournalEntry[]): string {
  if (entries.length === 0) return '<p class="empty">Aucune entrée dans le journal.</p>';
  return entries.map((entry) => {
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const symptomsStr =
      entry.symptoms.length > 0
        ? `<div class="symptoms">${entry.symptoms.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>`
        : '';
    const noteStr = entry.note
      ? `<p class="entry-note">${escapeHtml(entry.note).replace(/\n/g, '<br/>')}</p>`
      : '';
    return `
      <div class="entry">
        <div class="entry-header">
          <span class="mood">${entry.mood}</span>
          <div class="entry-meta">
            <div class="entry-date">${escapeHtml(dateStr)}</div>
            ${entry.weekOfPregnancy ? `<div class="entry-week">Semaine ${entry.weekOfPregnancy}</div>` : ''}
          </div>
        </div>
        ${symptomsStr}
        ${noteStr}
      </div>
    `;
  }).join('');
}

function buildShelfHtml(
  shelfItems: Array<{ productName?: string; brand?: string; verdict?: string }>,
): string {
  if (shelfItems.length === 0) return '<p class="empty">Placard vide.</p>';
  const listItems = shelfItems
    .map((item) => {
      const verdictColor =
        item.verdict === 'danger' ? '#C27B7B' : item.verdict === 'caution' ? '#D4A853' : '#7CB69F';
      const verdictLabel =
        item.verdict === 'danger' ? 'À éviter' : item.verdict === 'caution' ? 'Vigilance' : 'Compatible';
      return `<li><span class="product-name">${escapeHtml(item.productName ?? 'Produit')}</span>${item.brand ? ` — ${escapeHtml(item.brand)}` : ''} <span style="color:${verdictColor};font-weight:600;">${verdictLabel}</span></li>`;
    })
    .join('');
  return `<ul class="shelf-list">${listItems}</ul>`;
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; color: #2D2926; background: #FFFAF5; }
  .cover {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(160deg, #FFF5EE 0%, #E8D5B0 100%);
    padding: 60px 40px; page-break-after: always;
  }
  .cover-logo { font-size: 48px; font-weight: 700; letter-spacing: 4px; color: #A88B4A; margin-bottom: 16px; }
  .cover-title { font-size: 28px; font-weight: 400; color: #2D2926; margin-bottom: 12px; letter-spacing: 1px; }
  .cover-name { font-size: 22px; font-style: italic; color: #8C7E75; margin-bottom: 8px; }
  .cover-date { font-size: 14px; color: #B8ADA6; margin-bottom: 40px; letter-spacing: 0.5px; }
  .glow-score { text-align: center; background: white; padding: 24px 48px; border-radius: 16px; border: 1px solid #E8D5B0; }
  .glow-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #B8ADA6; margin-bottom: 8px; }
  .glow-value { font-size: 48px; font-weight: 700; color: #C9A96E; }
  .section { padding: 40px; max-width: 800px; margin: 0 auto; }
  .section-title { font-size: 20px; font-weight: 700; color: #A88B4A; border-bottom: 2px solid #E8D5B0; padding-bottom: 12px; margin-bottom: 24px; letter-spacing: 0.5px; }
  .entry { background: white; border: 1px solid #EDE7E1; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .entry-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
  .mood { font-size: 32px; }
  .entry-meta { flex: 1; }
  .entry-date { font-size: 15px; font-weight: 600; color: #2D2926; }
  .entry-week { font-size: 12px; color: #8C7E75; margin-top: 2px; }
  .symptoms { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .chip { background: #E8D5B0; color: #A88B4A; padding: 3px 10px; border-radius: 999px; font-size: 12px; }
  .entry-note { font-size: 14px; color: #8C7E75; line-height: 1.6; }
  .empty { color: #B8ADA6; font-style: italic; padding: 20px 0; }
  .shelf-list { list-style: none; padding: 0; }
  .shelf-list li { padding: 10px 0; border-bottom: 1px solid #F5F0EB; font-size: 14px; color: #2D2926; }
  .product-name { font-weight: 600; }
`;

export async function exportJournalToPdf(firstName?: string | null): Promise<void> {
  try {
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable && Platform.OS !== 'web') {
      Alert.alert('Non disponible', "Le partage n'est pas disponible sur cet appareil.");
      return;
    }

    const journalRaw = await AsyncStorage.getItem(STORAGE_KEYS.journalEntries);
    const journalEntries: JournalEntry[] = journalRaw ? JSON.parse(journalRaw) : [];
    journalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const shelfRaw = await AsyncStorage.getItem(STORAGE_KEYS.shelf);
    const shelfItems: Array<{ productName?: string; brand?: string; verdict?: string }> = shelfRaw
      ? JSON.parse(shelfRaw)
      : [];

    const totalShelf = shelfItems.length;
    const safeShelf = shelfItems.filter((i) => i.verdict === 'safe').length;
    const cautionShelf = shelfItems.filter((i) => i.verdict === 'caution').length;
    const dangerShelf = shelfItems.filter((i) => i.verdict === 'danger').length;
    let glowScore = 0;
    if (totalShelf > 0) {
      glowScore = (safeShelf * 100 + cautionShelf * 40) / totalShelf;
      if (dangerShelf === 0) glowScore = Math.min(100, glowScore + 5);
      glowScore = Math.max(0, Math.min(100, Math.round(glowScore)));
    }

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>${CSS}</style>
      </head>
      <body>
        ${buildCoverPage(firstName, glowScore)}
        <div class="section">
          <div class="section-title">Mes entrées de journal</div>
          ${buildEntriesHtml(journalEntries)}
        </div>
        <div class="section">
          <div class="section-title">Mon placard beauté</div>
          ${buildShelfHtml(shelfItems)}
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Partager mon journal de grossesse',
      UTI: 'com.adobe.pdf',
    });
  } catch {
    Alert.alert('Erreur', 'Impossible de générer le PDF. Réessayez.');
  }
}
