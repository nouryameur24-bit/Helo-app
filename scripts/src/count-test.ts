import { scrapeCosIng } from './ingredients-pipeline/scrapers/cosing.js';
import { scrapeEFSA } from './ingredients-pipeline/scrapers/efsa.js';
import { scrapeCRAT } from './ingredients-pipeline/scrapers/crat.js';
import { scrapeMedications } from './ingredients-pipeline/scrapers/medications.js';

async function count() {
  const cosing = await scrapeCosIng();
  const efsa = await scrapeEFSA();
  const crat = await scrapeCRAT();
  const meds = await scrapeMedications();
  const all = [...cosing, ...efsa, ...crat, ...meds];
  const unique = new Set(all.map(i => i.name_inci));
  console.log('cosing:', cosing.length);
  console.log('efsa:', efsa.length);
  console.log('crat:', crat.length);
  console.log('meds:', meds.length);
  console.log('total raw:', all.length);
  console.log('unique (by name_inci):', unique.size);
}
count().catch(console.error);
