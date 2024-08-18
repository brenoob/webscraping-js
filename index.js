import puppeteer from 'puppeteer'
import fs from 'fs/promises'
import { readFile } from 'fs/promises'

const dragonsNames = await readFile(new URL('./', import.meta.url))
const jsonDragonsNames = JSON.parse(dragonsNames)

const findDuplicateNames = (dragons) => {
  const nameCount = {}
  const idCount = {}
  const nameCountHatchingTimes = {}
  const nameCountImageUrls = {}
  const duplicateNames = []
  const duplicateIds = []
  const duplicateHatchingTimes = []
  const duplicateImageUrls = []

  dragons.forEach((dragon) => {
    const name = dragon.name
    const id = dragon.id
    const hatchingTimes = dragon.hatchingTimes
    const imageUrls = dragon.imageUrls
    // const name = dragon.imageUrls
    nameCount[name] = (nameCount[name] || 0) + 1
    idCount[id] = (idCount[id] || 0) + 1
    nameCountHatchingTimes[hatchingTimes] = (nameCountHatchingTimes[hatchingTimes] || 0) + 1
    nameCountImageUrls[imageUrls] = (nameCountImageUrls[imageUrls] || 0) + 1
  })

  Object.entries(nameCount).forEach(([name, count]) => {
    if (count > 1) {
      duplicateNames.push(name)
    }
  })

  Object.entries(idCount).forEach(([id, count]) => {
    if (count > 1) {
      duplicateIds.push(id)
    }
  })

  Object.entries(nameCountHatchingTimes).forEach(([hatchingTimes, count]) => {
    if (count > 1) {
      duplicateHatchingTimes.push(hatchingTimes)
    }
  })

  Object.entries(nameCountImageUrls).forEach(([imageUrls, count]) => {
    if (count > 1) {
      duplicateImageUrls.push(imageUrls)
    }
  })

  return { duplicateNames, duplicateIds, duplicateHatchingTimes, duplicateImageUrls }
  // return duplicateNames
}

console.log(findDuplicateNames(jsonDragonsNames))
// console.log(findDuplicateNames(jsonDragonsNames))

console.log(`Total de dragões a serem processados: ${jsonDragonsNames.length}`)
console.time('Tempo total de coleta')

const CONCURRENT_TABS = 5 // Reduzido para 5 para evitar sobrecarga
const BATCH_SIZE = 50 // Reduzido para 50 para processar lotes menores

const searchTimerEggs = async (name, page) => {
  try {
    await page.goto(`https://www.ditlep.com/dragons/${name}?lang=pt-pt`, {
      timeout: 50000,
      waitUntil: 'domcontentloaded'
    })

    const result = await page.evaluate(() => {
      const hatchingElements = document.querySelectorAll('.ng-binding')
      const imageElements = document.querySelectorAll(
        'div.top10.m-scroll.m-left-negative-10.m-right-negative-10.dragon-image.box-view div.ng-scope img[ng-src]'
      )

      const timeUnits = ['day', 'days', 'hour', 'hours', 'minute', 'minutes', 'second', 'seconds']
      const hatchingTimes = Array.from(hatchingElements)
        .map((element) => element.textContent.trim())
        .filter((text) => timeUnits.some((unit) => text.includes(unit)))
        .filter((text) => !text.startsWith('Created:') && !text.startsWith('Description'))

      const imageUrls = Array.from(imageElements).map((img) => img.getAttribute('ng-src'))

      return {
        hatchingTimes:
          hatchingTimes.length > 0 ? hatchingTimes : 'Tempo de incubação não encontrado',
        imageUrls: imageUrls.length > 0 ? imageUrls : 'Nenhuma imagem encontrada'
      }
    })

    return { name, ...result }
  } catch (error) {
    console.error(`Erro ao processar ${name}: ${error.message}`)
    return null
  }
}

const processBatch = async (batch, browser) => {
  const pages = await Promise.all(
    Array(CONCURRENT_TABS)
      .fill()
      .map(() => browser.newPage())
  )

  for (const page of pages) {
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort()
      } else {
        request.continue()
      }
    })
  }

  const results = []
  for (let i = 0; i < batch.length; i += CONCURRENT_TABS) {
    const currentBatch = batch.slice(i, i + CONCURRENT_TABS)
    const batchResults = await Promise.all(
      currentBatch.map((name, index) => searchTimerEggs(name, pages[index]))
    )
    results.push(...batchResults.filter(Boolean))
    console.log(`Processados: ${results.length}/${batch.length}`)
  }

  for (const page of pages) {
    await page.close()
  }

  return results
}

const runScraping = async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  })

  const results = []
  for (let i = 0; i < jsonDragonsNames.length; i += BATCH_SIZE) {
    const batch = jsonDragonsNames.slice(i, i + BATCH_SIZE)
    console.log(
      `Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jsonDragonsNames.length / BATCH_SIZE)}`
    )
    const batchResults = await processBatch(batch, browser)
    results.push(...batchResults)
    console.log(`Total processado: ${results.length}/${jsonDragonsNames.length}`)
    console.log(findDuplicateNames(results))

    // Adiciona um pequeno delay entre os lotes para evitar sobrecarga
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  await browser.close()

  const finalResults = results.map((result, index) => ({
    id: index + 1,
    ...result
  }))

  const resultJson = JSON.stringify(finalResults, null, 2)
  await fs.writeFile('./resultsIndex2.json', resultJson, 'utf8')
  console.timeEnd('Tempo total de coleta')
  console.log(`\nResultado final:`)
  console.log(`Total de dragões processados com sucesso: ${finalResults.length}`)
  console.log(`Total de dragões que falharam: ${jsonDragonsNames.length - finalResults.length}`)
}

runScraping()
