using CobblemonMarketApi.Data;
using CobblemonMarketApi.Dtos.PokemonSearch;
using Microsoft.EntityFrameworkCore;

namespace CobblemonMarketApi.Services;

    public class PokemonSearchService : IPokemonSearchService
    {
        private readonly AppDbContext _context;

        public PokemonSearchService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<PokemonAutocompleteDto>> AutocompleteAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Enumerable.Empty<PokemonAutocompleteDto>();
            }

            query = query.Trim().ToLower();

            var matches = await _context.PokemonCatalog
                .AsNoTracking()
                .Where(p =>
                    p.EnglishName.ToLower().StartsWith(query) ||
                    p.FrenchName.ToLower().StartsWith(query))
                .OrderBy(p => p.PokedexNumber)
                .Take(10)
                .Select(p => new
                {
                    p.EnglishName,
                    p.FrenchName,
                    p.PokedexNumber,
                    p.DefaultImageUrl
                })
                .ToListAsync();

            var pokedexNumbers = matches.Select(x => x.PokedexNumber).Distinct().ToList();
            var formsByPokedex = await GetFormsByPokedexAsync(pokedexNumbers);

            return matches.Select(p => new PokemonAutocompleteDto
            {
                EnglishName = p.EnglishName,
                FrenchName = p.FrenchName,
                PokedexNumber = p.PokedexNumber,
                ImageUrl = p.DefaultImageUrl,
                Forms = formsByPokedex.TryGetValue(p.PokedexNumber, out var forms) ? forms : new List<string>()
            });
        }
        
        public async Task<PokemonDetailsDto?> GetByNameAsync(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return null;
            }

            name = name.Trim().ToLower();

            var pokemon = await _context.PokemonCatalog
                .FirstOrDefaultAsync(p =>
                    p.EnglishName.ToLower() == name ||
                    p.FrenchName.ToLower() == name);

            if (pokemon == null)
            {
                return null;
            }

            return new PokemonDetailsDto
            {
                Name = pokemon.EnglishName,
                PokedexNumber = pokemon.PokedexNumber,
                ImageUrl = pokemon.DefaultImageUrl,
                Abilities = new List<string>(),
                Forms = await GetFormsAsync(pokemon.PokedexNumber)
            };
        }

        private async Task<List<string>> GetFormsAsync(int pokedexNumber)
        {
            return await _context.PokemonFormCatalog
                .AsNoTracking()
                .Where(x => x.PokedexNumber == pokedexNumber && !string.IsNullOrWhiteSpace(x.FormKey))
                .Select(x => x.FormKey.Trim())
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();
        }

        private async Task<Dictionary<int, List<string>>> GetFormsByPokedexAsync(List<int> pokedexNumbers)
        {
            if (pokedexNumbers.Count == 0)
            {
                return new Dictionary<int, List<string>>();
            }

            var formRows = await _context.PokemonListings
                .AsNoTracking()
                .Where(x => pokedexNumbers.Contains(x.PokedexNumber) && !string.IsNullOrWhiteSpace(x.Form))
                .Select(x => new { x.PokedexNumber, Form = x.Form.Trim() })
                .Distinct()
                .ToListAsync();

            var catalogFormRows = await _context.PokemonFormCatalog
                .AsNoTracking()
                .Where(x => pokedexNumbers.Contains(x.PokedexNumber) && !string.IsNullOrWhiteSpace(x.FormKey))
                .Select(x => new { x.PokedexNumber, Form = x.FormKey.Trim() })
                .Distinct()
                .ToListAsync();

            return formRows
                .Concat(catalogFormRows)
                .GroupBy(x => x.PokedexNumber)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.Form)
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .OrderBy(x => x)
                        .ToList());
        }
        
    }
