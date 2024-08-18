import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { readFile } from 'fs/promises';

const dragonsUrls = await readFile(new URL('./namesAndUrls.json', import.meta.url));
const jsonDragonsUrls = JSON.parse(dragonsUrls);

const searchTimerEggs = async (name, page) => {
  try {
    await page.goto(`https://www.ditlep.com/dragons/${name.url}/?lang=pt-pt`, {
      timeout: 40000,
      waitUntil: 'domcontentloaded',
    });

    const result = await page.evaluate(() => {
      // Encontra o `td` com o texto "Tempo de incubação:"
      const rows = Array.from(document.querySelectorAll('tr'));
      let hatchingTime = 'Tempo de incubação não encontrado';

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 1 && cells[0].textContent.trim() === 'Tempo de incubação:') {
          hatchingTime = cells[1].textContent.trim();
        }
      });

      // Encontra as imagens
      const imageElements = document.querySelectorAll(
        'div.top10.m-scroll.m-left-negative-10.m-right-negative-10.dragon-image.box-view div.ng-scope img[ng-src]'
      );

      const imageUrls = Array.from(imageElements).map((img) => img.getAttribute('ng-src'));

      return {
        hatchingTimes: hatchingTime,
        imageUrls: imageUrls.length > 0 ? imageUrls : 'Nenhuma imagem encontrada',
      };
    });

    return { name, ...result };
  } catch (error) {
    console.error(`Erro ao processar ${name.url}: ${error.message}`);
    return null;
  }
};

const CONCURRENT_TABS = 5;

const BATCH_SIZE = 50;

const processBatch = async (batch, browser) => {
  const pages = await Promise.all(
    Array(CONCURRENT_TABS)
      .fill()
      .map(() => browser.newPage())
  );

  for (const page of pages) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  const results = [];
  for (let i = 0; i < batch.length; i += CONCURRENT_TABS) {
    const currentBatch = batch.slice(i, i + CONCURRENT_TABS);
    const batchResults = await Promise.all(
      currentBatch.map((name, index) => searchTimerEggs(name, pages[index]))
    );
    results.push(...batchResults.filter(Boolean));
    console.log(`Processados: ${results.length}/${batch.length}`);
  }

  for (const page of pages) {
    await page.close();
  }

  return results;
};

const runScraping = async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const results = [];
  for (let i = 0; i < jsonDragonsUrls.length; i += BATCH_SIZE) {
    const batch = jsonDragonsUrls.slice(i, i + BATCH_SIZE);
    console.log(
      `Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jsonDragonsUrls.length / BATCH_SIZE)}`
    );
    const batchResults = await processBatch(batch, browser);
    results.push(...batchResults);
    console.log(`Total processado: ${results.length}/${jsonDragonsUrls.length}`);

    // Adiciona um pequeno delay entre os lotes para evitar sobrecarga
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  await browser.close();

  const finalResults = results.map((result, index) => ({
    id: index + 1,
    ...result
  }));

  const resultJson = JSON.stringify(finalResults, null, 2);
  await fs.writeFile('./json/dataResults.json', resultJson, 'utf8');
  console.timeEnd('Tempo total de coleta');
  console.log(`\nResultado final:`);
  console.log(`Total de dragões processados com sucesso: ${finalResults.length}`);
  console.log(`Total de dragões que falharam: ${jsonDragonsUrls.length - finalResults.length}`);
};

runScraping();
