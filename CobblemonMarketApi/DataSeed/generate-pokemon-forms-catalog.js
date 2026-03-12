const fs = require('fs');
const path = require('path');

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
}

function capitalizeWords(value) {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(x => x.charAt(0).toUpperCase() + x.slice(1))
        .join(' ');
}

function normalizeFormKey(apiName, speciesName) {
    if (apiName === speciesName) {
        return '';
    }

    if (apiName.startsWith(`${speciesName}-`)) {
        return apiName.slice(speciesName.length + 1).toLowerCase();
    }

    return apiName.toLowerCase();
}

function buildDisplayName(speciesName, formKey) {
    if (!formKey) {
        return capitalizeWords(speciesName);
    }

    return `${capitalizeWords(speciesName)} (${capitalizeWords(formKey)})`;
}

async function main() {
    const speciesListUrl = 'https://pokeapi.co/api/v2/pokemon-species?limit=2000&offset=0';
    const speciesList = await fetchJson(speciesListUrl);
    const results = [];

    for (const speciesEntry of speciesList.results) {
        const species = await fetchJson(speciesEntry.url);
        const speciesName = species.name.toLowerCase();
        const pokedexNumber = species.id;

        for (const variety of species.varieties || []) {
            const pokemonData = await fetchJson(variety.pokemon.url);
            const apiName = pokemonData.name.toLowerCase();
            const formKey = normalizeFormKey(apiName, speciesName);

            if (!formKey) {
                continue;
            }

            results.push({
                pokedexNumber,
                formKey,
                apiName,
                displayName: buildDisplayName(speciesName, formKey),
                defaultImageUrl: pokemonData.sprites?.front_default || '',
                shinyImageUrl: pokemonData.sprites?.front_shiny || null
            });

            console.log(`Loaded #${pokedexNumber} ${apiName} (${formKey})`);
        }
    }

    results.sort((a, b) => {
        if (a.pokedexNumber !== b.pokedexNumber) {
            return a.pokedexNumber - b.pokedexNumber;
        }
        return a.formKey.localeCompare(b.formKey);
    });

    const outputPath = path.join(__dirname, 'pokemon-forms-catalog.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

    console.log(`Done. File written to: ${outputPath} (${results.length} forms)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
