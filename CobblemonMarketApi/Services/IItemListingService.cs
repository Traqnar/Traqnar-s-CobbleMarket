using CobblemonMarketApi.Dtos.ItemListings;

namespace CobblemonMarketApi.Services;

public interface IItemListingService
{
    Task<IEnumerable<ItemListingDto>> GetAllByShowcaseAsync(int showcaseId);
    Task<ItemListingDto?> GetByIdAsync(int showcaseId, int id);
    Task<ItemListingDto?> CreateAsync(int showcaseId, CreateItemListingDto dto);
    Task<ItemListingDto?> AttachExistingAsync(int showcaseId, int listingId);
    Task<bool> UpdateAsync(int showcaseId, int id, UpdateItemListingDto dto);
    Task<bool> DeleteAsync(int showcaseId, int id);
}
