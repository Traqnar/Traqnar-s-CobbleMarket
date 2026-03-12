const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "pokemon-abilities.json");
const API_BASE = "https://pokeapi.co/api/v2";
const MAX_POKEMON = 1025; // adapte si besoin

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${url}`);
    }

    return response.json();
}

function toDisplayName(value) {
    return value
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildPokemonAbilitiesEntry(id) {
    const pokemon = await fetchJson(`${API_BASE}/pokemon/${id}`);

    return {
        pokedexNumber: pokemon.id,
        pokemonName: toDisplayName(pokemon.name),
        abilities: (pokemon.abilities || [])
            .map(entry => ({
                name: toDisplayName(entry.ability.name),
                isHidden: entry.is_hidden,
                slot: entry.slot
            }))
            .sort((a, b) => a.slot - b.slot)
    };
}

async function main() {
    const results = [];

    for (let id = 1; id <= MAX_POKEMON; id++) {
        try {
            const entry = await buildPokemonAbilitiesEntry(id);
            results.push(entry);
            console.log(`OK #${entry.pokedexNumber} ${entry.pokemonName}`);
            await delay(60);
        } catch (error) {
            console.error(`FAIL #${id}: ${error.message}`);
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");
    console.log(`Generated ${results.length} entries into ${OUTPUT_FILE}`);
}

main().catch(error => {
    console.error("Fatal error while generating pokemon-abilities.json");
    console.error(error);
    process.exit(1);
});