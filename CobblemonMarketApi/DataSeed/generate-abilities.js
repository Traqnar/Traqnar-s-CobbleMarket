const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "abilities.json");
const API_BASE = "https://pokeapi.co/api/v2/ability?limit=10000";

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${url}`);
    }

    return response.json();
}

function capitalizeWords(value) {
    return value
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

async function main() {
    console.log("Fetching abilities list from PokéAPI...");
    const data = await fetchJson(API_BASE);

    if (!data.results || !Array.isArray(data.results)) {
        throw new Error("Invalid response format from PokéAPI.");
    }

    const abilities = data.results
        .map(a => ({
            name: capitalizeWords(a.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(abilities, null, 2), "utf-8");

    console.log(`Generated ${abilities.length} abilities into: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error("Error while generating abilities.json:");
    console.error(err);
    process.exit(1);
});