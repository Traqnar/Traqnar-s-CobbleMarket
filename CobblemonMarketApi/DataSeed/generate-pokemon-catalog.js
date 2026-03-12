const fs = require('fs');
const path = require('path');

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.json();
}

function capitalize(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildImageUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

async function main() {
    const speciesListUrl = 'https://pokeapi.co/api/v2/pokemon-species?limit=2000&offset=0';
    const speciesList = await fetchJson(speciesListUrl);

    const results = [];

    for (const entry of speciesList.results) {
        const species = await fetchJson(entry.url);

        const pokedexNumber = species.id;
        const englishName = capitalize(species.name);

        const frenchNameEntry = species.names.find(
            n => n.language?.name === 'fr'
        );

        const frenchName = frenchNameEntry
            ? frenchNameEntry.name
            : englishName;

        results.push({
            pokedexNumber,
            englishName,
            frenchName,
            defaultImageUrl: buildImageUrl(pokedexNumber)
        });

        console.log(`Loaded #${pokedexNumber} ${englishName} / ${frenchName}`);
    }

    results.sort((a, b) => a.pokedexNumber - b.pokedexNumber);

    const outputPath = path.join(__dirname, 'pokemon-catalog.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

    console.log(`Done. File written to: ${outputPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});