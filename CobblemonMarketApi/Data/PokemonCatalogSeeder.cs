using System.Text.Json;
using CobblemonMarketApi.Data;
using CobblemonMarketApi.Models;
using CobblemonShowcase.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CobblemonShowcase.Api.Data;

public static class PokemonCatalogSeeder
{
    public static async Task SeedAsync(AppDbContext db, IWebHostEnvironment env)
    {
        if (await db.PokemonCatalog.AnyAsync())
        {
            return;
        }

        var filePath = Path.Combine(env.ContentRootPath, "SeedData", "pokemon-catalog.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("Le fichier pokemon-catalog.json est introuvable.", filePath);
        }

        var json = await File.ReadAllTextAsync(filePath);

        var entries = JsonSerializer.Deserialize<List<PokemonCatalogJsonEntry>>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (entries is null || entries.Count == 0)
        {
            throw new Exception("Le fichier pokemon-catalog.json est vide ou invalide.");
        }

        var catalogEntries = entries.Select(x => new PokemonCatalog()
        {
            PokedexNumber = x.PokedexNumber,
            EnglishName = x.EnglishName.Trim(),
            FrenchName = x.FrenchName.Trim(),
            DefaultImageUrl = x.DefaultImageUrl.Trim()
        }).ToList();

        await db.PokemonCatalog.AddRangeAsync(catalogEntries);
        await db.SaveChangesAsync();
    }
}