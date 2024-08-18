import puppeteer from 'puppeteer';
import fs from 'fs/promises';

// Função para formatar o nome do dragão mantendo acentos
const formatName = (name) => {
  return name.toLowerCase()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    // .replace(/[^\w\-]/g, ''); // Remove caracteres não permitidos, mas mantém acentos
};

const scrapeDragonNames = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    timeout: 0,
  });
  const page = await browser.newPage();
  const allDragons = [];
  const seenDragons = new Set(); // Usando um Set para evitar duplicatas

  try {
    await page.goto('https://www.ditlep.com/code?lang=pt-pt', { waitUntil: 'networkidle2' });

    let hasMorePages = true;

    while (hasMorePages) {
      console.log('Coletando nomes e códigos dos dragões da página atual...');

      // Coleta os códigos e nomes dos dragões
      const dragons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div.dragon-info-container'))
          .map(container => {
            const codeElement = container.querySelector('div.dragon-info div.ng-binding b.text-danger.ng-binding');
            const nameElement = container.querySelector('div.dragon-info div b.text-success.ng-binding');
            const code = codeElement ? codeElement.textContent.trim() : '';
            const name = nameElement ? nameElement.textContent.trim() : '';

            return { code, name };
          });
      });

      // Formata o nome e cria a URL
      dragons.forEach(({ code, name }) => {
        if (name && code) { // Verifica se o nome e o código não estão vazios
          const formattedName = formatName(name);
          const url = `${code}/${formattedName}`;
          const identifier = `${code}-${formattedName}`; // Identificador único

          if (!seenDragons.has(identifier)) {
            seenDragons.add(identifier); // Adiciona ao Set para evitar duplicatas
            allDragons.push({ code, name, url });
          }
        }
      });

      console.log(`Dragões coletados até agora: ${allDragons.length}`);

      // Verifica se o botão de próximo está desabilitado
      hasMorePages = await page.evaluate(() => {
        const nextButton = document.querySelector('li.pagination-next.ng-scope a.ng-binding');
        return nextButton && !nextButton.parentElement.classList.contains('disabled');
      });

      if (hasMorePages) {
        console.log('Clicando no botão "Próximo"...');
        await page.click('li.pagination-next.ng-scope a.ng-binding');

        // Aguarda a próxima página carregar completamente
        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera de 5 segundos
        await page.waitForFunction(() => document.querySelector('li.pagination-next.ng-scope a.ng-binding') !== null, { timeout: 5000 });
      } else {
        console.log('Botão "Próximo" desabilitado. Coleta concluída.');
      }
    }
  } catch (error) {
    console.error(`Erro durante a coleta: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Salvar os resultados em um arquivo JSON
  const resultJson = JSON.stringify(allDragons, null, 2);
  await fs.writeFile('./json/namesAndUrls.json', resultJson, 'utf8');
  console.log('Os dados dos dragões foram salvos em namesAndUrls.json');
};

scrapeDragonNames();
