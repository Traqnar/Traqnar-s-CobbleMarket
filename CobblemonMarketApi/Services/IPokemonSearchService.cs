using CobblemonMarketApi.Dtos.PokemonSearch;

namespace CobblemonMarketApi.Services;

public interface IPokemonSearchService
    {
        Task<IEnumerable<PokemonAutocompleteDto>> AutocompleteAsync(string query);
        Task<PokemonDetailsDto?> GetByNameAsync(string name);
    }
