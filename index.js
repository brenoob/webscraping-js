import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

import fs from 'fs/promises';

// Configura o adblocker
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Lista de dragões a serem pesquisados
const dragonStoreName = ['whimsical-dragon', 'wind-dragon', 'lava-dragon', 'terra-dragon', 'flame-dragon', 'aztec-dragon'];

// Função para extrair informações de incubação de um dragão
const searchTimerEggs = async (name, page) => {
  try {
    await page.goto(`https://www.ditlep.com/dragons/${name}`, { timeout: 60000 });

    console.log(`Aguardando o seletor ".ng-binding" estar disponível para ${name}...`);
    await page.waitForSelector('.ng-binding', { timeout: 60000 });

    console.log(`Coletando o texto desejado para ${name}...`);
    // Coletar dados e formatar
    const hatchingTimes = await page.evaluate(() => {
      const elements = document.querySelectorAll('.ng-binding');

      // Filtra e formata os textos de tempo
      const timeUnits = ['day', 'days', 'hour', 'hours', 'minute', 'minutes', 'second', 'seconds'];
      return Array.from(elements)
        .map(element => element.textContent.trim())
        .filter(text => timeUnits.some(unit => text.includes(unit)))
        .map(text => {
          // Remove "Created:" e qualquer outra informação não relacionada a tempo
          if (text.startsWith('Created:')) {
            return null;
          }
          return text;
        })
        .filter(text => text !== null); // Remove os valores null
    });

    // Exclui os dados indesejados e formata o retorno
    return {
      name,
      hatchingTimes: hatchingTimes.length > 0 ? hatchingTimes : 'Tempo de incubação não encontrado',
    };
  } catch (error) {
    console.error(`Erro ao acessar a página ou extrair o texto para ${name}: ${error.message}`);
    return { name, hatchingTimes: 'Erro ao coletar dados' };
  }
};

// Função para rodar a coleta para todos os dragões
const runScraping = async () => {
  const browser = await puppeteer.launch({
    // headless: false, // Torna o navegador visível
  });

  const results = [];
  try {
    // Itera sobre a lista de dragões e coleta os dados
    for (const name of dragonStoreName) {
      console.log(`Abrindo nova aba para o dragão ${name}...`);
      const page = await browser.newPage();
      const result = await searchTimerEggs(name, page);
      results.push(result);
      await page.close(); // Fecha a aba após a coleta
    }
  } catch (error) {
    console.error(`Erro geral: ${error.message}`);
  } finally {
    await browser.close();
  }

  // salvar os resultados em um arquivo JSON
  const resultJson = JSON.stringify(results, null, 2)
  await fs.writeFile('results.json', resultJson, 'utf8')
  console.log('os dados foram salvos em results.json');
};

runScraping();
