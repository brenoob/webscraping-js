# Web Scraping JS

Este projeto é uma aplicação Node.js para coleta de dados de dragões usando Puppeteer. O script principal faz scraping de informações de incubação de dragões e salva os resultados em um arquivo JSON.

## Tecnologias Usadas
![puppeteer](https://img.shields.io/badge/puppeteer-%2335495e.svg?style=for-the-badge)
![javascript](https://img.shields.io/badge/javascript-%23ffd859.svg?style=for-the-badge&Color=black)



## Estrutura do Projeto

O projeto está dividido em três arquivos principais:

- **`index.js`**: O script principal que utiliza Puppeteer para realizar o scraping e salvar os dados em um arquivo JSON.
- **`dragonUrlsResults.js`**: Script para carregar e processar os dados de `results.json`.
- **`results.json`**: Arquivo gerado pelo `index.js` contendo os resultados do scraping.

## Dependências

As seguintes dependências são utilizadas no projeto:

- `fs-extra`: Biblioteca para operações de arquivos com funcionalidades adicionais.
- `nodemon`: Ferramenta para desenvolvimento que reinicia automaticamente o servidor.
- `puppeteer`: Biblioteca para controle de navegador headless.
- `puppeteer-extra`: Biblioteca para adicionar plugins ao Puppeteer.
- `puppeteer-extra-plugin-adblocker`: Plugin para bloquear anúncios no Puppeteer.


## Como Rodar 🏗️

Instale as dependências:

    pnpm install

Execute o script principal:

    pnpm run start

Ou, para desenvolvimento com reinício automático:

    pnpm run start:dev


## Resultados:
Após a execução do script, os resultados do scraping serão salvos no arquivo results.json.

## Links Úteis

:link: [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)


