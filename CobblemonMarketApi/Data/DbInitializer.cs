using System.Text.Json;
using CobblemonMarketApi.Models;
using CobblemonShowcase.Api.Models;

namespace CobblemonMarketApi.Data;

public static class DbInitializer
{
    public static void SeedPokemonCatalog(AppDbContext context)
    {
        if (context.PokemonCatalog.Any())
        {
            Console.WriteLine("PokemonCatalog already contains data. Seed skipped.");
            return;
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "DataSeed", "pokemon-catalog.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("pokemon-catalog.json introuvable.", filePath);
        }

        var json = File.ReadAllText(filePath);

        var entries = JsonSerializer.Deserialize<List<PokemonCatalogJsonEntry>>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (entries == null || entries.Count == 0)
        {
            throw new Exception("pokemon-catalog.json est vide ou invalide.");
        }

        var catalogEntries = entries.Select(x => new PokemonCatalog
        {
            PokedexNumber = x.PokedexNumber,
            EnglishName = x.EnglishName.Trim(),
            FrenchName = x.FrenchName.Trim(),
            DefaultImageUrl = x.DefaultImageUrl.Trim()
        }).ToList();

        context.PokemonCatalog.AddRange(catalogEntries);
        context.SaveChanges();

        Console.WriteLine($"Inserted {catalogEntries.Count} rows into PokemonCatalog.");
    }

    public static void SeedAbilityCatalog(AppDbContext context)
    {
        if (context.AbilityCatalog.Any())
        {
            Console.WriteLine("AbilityCatalog already contains data. Seed skipped.");
            return;
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "DataSeed", "abilities.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("abilities.json introuvable.", filePath);
        }

        var json = File.ReadAllText(filePath);

        var entries = JsonSerializer.Deserialize<List<AbilityCatalogJsonEntry>>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (entries == null || entries.Count == 0)
        {
            throw new Exception("abilities.json est vide ou invalide.");
        }

        var abilities = entries
            .Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .Select(x => new AbilityCatalog
            {
                Name = x.Name.Trim()
            })
            .DistinctBy(x => NormalizeAbilityName(x.Name))
            .ToList();

        context.AbilityCatalog.AddRange(abilities);
        context.SaveChanges();

        Console.WriteLine($"Inserted {abilities.Count} rows into AbilityCatalog.");
    }

    public static void SeedPokemonFormCatalog(AppDbContext context)
    {
        if (context.PokemonFormCatalog.Any())
        {
            Console.WriteLine("PokemonFormCatalog already contains data. Seed skipped.");
            return;
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "DataSeed", "pokemon-forms-catalog.json");

        if (!File.Exists(filePath))
        {
            Console.WriteLine("pokemon-forms-catalog.json introuvable. Seed PokemonFormCatalog skipped.");
            return;
        }

        var json = File.ReadAllText(filePath);

        var entries = JsonSerializer.Deserialize<List<PokemonFormCatalogJsonEntry>>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (entries == null || entries.Count == 0)
        {
            Console.WriteLine("pokemon-forms-catalog.json est vide. Seed PokemonFormCatalog skipped.");
            return;
        }

        var existingPokedexNumbers = context.PokemonCatalog
            .Select(x => x.PokedexNumber)
            .ToHashSet();

        var formEntries = entries
            .Where(x => existingPokedexNumbers.Contains(x.PokedexNumber))
            .Where(x => !string.IsNullOrWhiteSpace(x.FormKey))
            .Where(x => !string.IsNullOrWhiteSpace(x.ApiName))
            .Where(x => !string.IsNullOrWhiteSpace(x.DefaultImageUrl))
            .GroupBy(x => new
            {
                x.PokedexNumber,
                FormKey = x.FormKey.Trim().ToLowerInvariant()
            })
            .Select(g => g.First())
            .Select(x => new PokemonFormCatalog
            {
                PokedexNumber = x.PokedexNumber,
                FormKey = x.FormKey.Trim().ToLowerInvariant(),
                ApiName = x.ApiName.Trim().ToLowerInvariant(),
                DisplayName = string.IsNullOrWhiteSpace(x.DisplayName) ? x.ApiName.Trim() : x.DisplayName.Trim(),
                DefaultImageUrl = x.DefaultImageUrl.Trim(),
                ShinyImageUrl = string.IsNullOrWhiteSpace(x.ShinyImageUrl) ? null : x.ShinyImageUrl.Trim()
            })
            .ToList();

        context.PokemonFormCatalog.AddRange(formEntries);
        context.SaveChanges();

        Console.WriteLine($"Inserted {formEntries.Count} rows into PokemonFormCatalog.");
    }

    public static void SeedPokemonAbilities(AppDbContext context)
    {
        if (context.PokemonAbilities.Any())
        {
            Console.WriteLine("PokemonAbilities already contains data. Seed skipped.");
            return;
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "DataSeed", "pokemon-abilities.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("pokemon-abilities.json introuvable.", filePath);
        }

        var json = File.ReadAllText(filePath);

        var entries = JsonSerializer.Deserialize<List<PokemonAbilityJsonEntry>>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (entries == null || entries.Count == 0)
        {
            throw new Exception("pokemon-abilities.json est vide ou invalide.");
        }

        var allAbilities = context.AbilityCatalog.ToList();
        var allPokemon = context.PokemonCatalog.ToList();

        Console.WriteLine($"PokemonCatalog count: {allPokemon.Count}");
        Console.WriteLine($"AbilityCatalog count: {allAbilities.Count}");
        Console.WriteLine($"Pokemon ability JSON entries: {entries.Count}");

        var pokemonAbilities = new List<PokemonAbility>();

        foreach (var pokemonEntry in entries)
        {
            var pokemonExists = allPokemon.Any(p => p.PokedexNumber == pokemonEntry.PokedexNumber);
            if (!pokemonExists)
            {
                Console.WriteLine($"Pokemon not found in catalog: #{pokemonEntry.PokedexNumber}");
                continue;
            }

            foreach (var ability in pokemonEntry.Abilities)
            {
                var abilityEntity = allAbilities.FirstOrDefault(a =>
                    NormalizeAbilityName(a.Name) == NormalizeAbilityName(ability.Name));

                if (abilityEntity == null)
                {
                    Console.WriteLine($"Ability not found in catalog: '{ability.Name}' for pokemon #{pokemonEntry.PokedexNumber}");
                    continue;
                }

                pokemonAbilities.Add(new PokemonAbility
                {
                    PokedexNumber = pokemonEntry.PokedexNumber,
                    AbilityCatalogId = abilityEntity.Id,
                    IsHidden = ability.IsHidden,
                    Slot = ability.Slot
                });
            }
        }

        context.PokemonAbilities.AddRange(pokemonAbilities);
        context.SaveChanges();

        Console.WriteLine($"Inserted {pokemonAbilities.Count} rows into PokemonAbilities.");
    }

    private static string NormalizeAbilityName(string value)
    {
        return value.Trim().ToLowerInvariant().Replace("-", " ");
    }
}
