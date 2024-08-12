import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import dragonsNames from './dragonsNames.json' assert { type: 'json' };

let currentId = 1; // Variável global para o ID

// Lista de dragões a serem pesquisados
const dragonStoreName = dragonsNames;

// Função para extrair informações de incubação de um dragão
const searchTimerEggs = async (name, page) => {
  try {
    await page.goto(`https://www.ditlep.com/dragons/${name}`, { waitUntil: 'networkidle2' });

    console.log(`Aguardando o seletor ".ng-binding" estar disponível para ${name}...`);
    await page.waitForSelector('.ng-binding');

    console.log(`Coletando o texto desejado e URLs das imagens para ${name}...`);
    // Coletar dados e formatar
    const { hatchingTimes, imageUrls } = await page.evaluate(() => {
      const hatchingElements = document.querySelectorAll('.ng-binding');
      const imageElements = document.querySelectorAll('div.top10.m-scroll.m-left-negative-10.m-right-negative-10.dragon-image.box-view div.ng-scope img[ng-src]');

      // Filtra e formata os textos de tempo
      const timeUnits = ['day', 'days', 'hour', 'hours', 'minute', 'minutes', 'second', 'seconds'];
      const hatchingTimes = Array.from(hatchingElements)
        .map(element => element.textContent.trim())
        .filter(text => timeUnits.some(unit => text.includes(unit)))
        .map(text => {
          if (text.startsWith('Created:') || text.startsWith('Description')) {
            return null;
          }
          return text;
        })
        .filter(text => text !== null);

      // Extrai URLs das imagens
      const imageUrls = Array.from(imageElements)
        .map(img => img.getAttribute('ng-src'));

      return {
        hatchingTimes: hatchingTimes.length > 0 ? hatchingTimes : 'Tempo de incubação não encontrado',
        imageUrls: imageUrls.length > 0 ? imageUrls : 'Nenhuma imagem encontrada'
      };
    });

    return {
      id: currentId++, // Incrementa o ID a cada dragão
      name,
      hatchingTimes,
      imageUrls
    };
  } catch (error) {
    console.error(`Erro ao acessar a página ou extrair os dados para ${name}: ${error.message}`);
    return { id: currentId++, name, hatchingTimes: 'Erro ao coletar dados', imageUrls: 'Erro ao coletar imagens' };
  }
};

// Função para rodar a coleta para todos os dragões com controle de fluxo
const runScraping = async () => {
  console.time('Tempo total de coleta'); // Inicia o temporizador

  console.log(`Total de dragões a serem pesquisados: ${dragonStoreName.length}`);
  
  const browser = await puppeteer.launch({
    defaultViewport: null,
    timeout: 0,
  });

  const results = [];
  const concurrentLimit = 50; // Limite de abas abertas simultaneamente
  const pageQueue = []; // Fila de promessas de páginas abertas

  try {
    for (let i = 0; i < dragonStoreName.length; i += concurrentLimit) {
      const batch = dragonStoreName.slice(i, i + concurrentLimit);
      const batchPromises = batch.map(async (name) => {
        const page = await browser.newPage();
        try {
          const result = await searchTimerEggs(name, page);
          console.log(`Resultados da coleta para ${name}: `, result.id);
          return result;
        } finally {
          await page.close(); // Fecha a aba após a coleta
        }
      });

      // Aguarda o processamento do lote atual
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Mostra quantos itens já foram coletados
      console.log(`Total de itens coletados até agora: ${results.length}`);

      // Adiciona um pequeno atraso entre os lotes para evitar sobrecarga
      if (i + concurrentLimit < dragonStoreName.length) {
        console.log('Aguardando 5 segundos antes de iniciar o próximo lote...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Atraso de 5 segundos
      }
    }
  } catch (error) {
    console.error(`Erro geral: ${error.message}`);
  } finally {
    await browser.close();
    console.timeEnd('Tempo total de coleta'); // Encerra o temporizador e mostra o tempo total
  }

  // Verifique o ID do último dragão
  const lastId = results.length > 0 ? results[results.length - 1].id : 'Nenhum resultado';
  console.log(`ID do último dragão: ${lastId}`);

  // Salvar os resultados em um arquivo JSON
  const resultJson = JSON.stringify(results, null, 2);
  await fs.writeFile('results.json', resultJson, 'utf8');
  console.log('Os dados foram salvos em results.json');
};

runScraping();
