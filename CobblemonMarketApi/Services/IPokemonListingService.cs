using CobblemonMarketApi.Dtos.PokemonListings;

namespace CobblemonMarketApi.Services;

public interface IPokemonListingService
{
    Task<IEnumerable<PokemonListingDto>> GetAllAsync();
    Task<IEnumerable<PokemonListingDto>> GetAllByShowcaseAsync(int showcaseId);
    Task<PokemonListingDto?> GetByIdAsync(int showcaseId, int id);
    Task<PokemonListingDto> CreateGlobalAsync(CreatePokemonListingDto dto);
    Task<PokemonListingDto?> CreateAsync(int showcaseId, CreatePokemonListingDto dto);
    Task<ImportPcPokemonListingsResultDto> ImportFromPcExportAsync(ImportPcExportDto dto);
    Task<PokemonListingDto?> AttachExistingAsync(int showcaseId, int listingId);
    Task<bool> UpdateGlobalAsync(int id, UpdatePokemonListingDto dto);
    Task<bool> UpdateAsync(int showcaseId, int id, UpdatePokemonListingDto dto);
    Task<bool> DeleteAsync(int showcaseId, int id);
    Task<bool> DeleteGlobalAsync(int id);
}
