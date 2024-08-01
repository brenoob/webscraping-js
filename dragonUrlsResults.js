import dragonStoreFromName from './results.json' assert { type: 'json'}

console.time()
const dragonStoreFromNameMap = new Map(dragonStoreFromName.map(dragon => [dragon.name.toLowerCase(), dragon]));
/**
 * Finds a dragon by its name.
 *
 * @param {string} name - The name of the dragon to find.
 * @return {Object|undefined} The dragon object with the given name, or undefined if not found.
 */
function findDragonName(name) {
    return dragonStoreFromNameMap.get(name.toLowerCase());
}

/**
 * Retrieves the first hatching time for a given dragon name.
 *
 * @param {string} name - The name of the dragon.
 * @return {string|null} The first hatching time for the dragon, or null if the dragon is not found or does not have hatching times.
 */
export function timerEggsFinishedResults(name) {
    const dragon = findDragonName(name);
    return dragon?.hatchingTimes?.[0] || null;
}

/**
 * Retrieves the gold per minute levels for a given dragon name.
 *
 * @param {string} name - The name of the dragon.
 * @return {Array<string>} An array of gold per minute levels for the dragon.
 *                         Returns an empty array if the dragon is not found or
 *                         does not have hatching times.
 */
export function goldForLevelsResults(name) {
    const dragon = findDragonName(name);
    if (!dragon || !dragon.hatchingTimes) {
        return [];
    }

    const goldPerMinutes = dragon.hatchingTimes.filter(text => text.startsWith('Level') && text.endsWith('gold per minutes'));
    return goldPerMinutes
}

console.log(timerEggsFinishedResults('lava-dragon'));
console.log(goldForLevelsResults('terra-dragon'));
console.timeEnd()
