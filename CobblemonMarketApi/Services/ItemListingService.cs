using CobblemonMarketApi.Data;
using CobblemonMarketApi.Dtos.ItemListings;
using CobblemonMarketApi.Models;
using Microsoft.EntityFrameworkCore;

namespace CobblemonMarketApi.Services;

public class ItemListingService : IItemListingService
{
    private readonly AppDbContext _context;

    public ItemListingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ItemListingDto>> GetAllByShowcaseAsync(int showcaseId)
    {
        var listings = await _context.ShowcaseItemListings
            .Where(x => x.ShowcaseId == showcaseId)
            .Select(x => x.ItemListing)
            .ToListAsync();

        return listings.Select(MapToDto);
    }

    public async Task<ItemListingDto?> GetByIdAsync(int showcaseId, int id)
    {
        var listing = await _context.ShowcaseItemListings
            .Where(x => x.ShowcaseId == showcaseId && x.ItemListingId == id)
            .Select(x => x.ItemListing)
            .FirstOrDefaultAsync();

        return listing == null ? null : MapToDto(listing);
    }

    public async Task<ItemListingDto?> CreateAsync(int showcaseId, CreateItemListingDto dto)
    {
        var showcaseExists = await _context.Showcases.AnyAsync(x => x.Id == showcaseId);

        if (!showcaseExists)
        {
            return null;
        }

        var listing = new ItemListing
        {
            Title = dto.Title,
            Price = dto.Price,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            StockQuantity = dto.StockQuantity
        };

        _context.ItemListings.Add(listing);
        await _context.SaveChangesAsync();

        _context.ShowcaseItemListings.Add(new ShowcaseItemListing
        {
            ShowcaseId = showcaseId,
            ItemListingId = listing.Id
        });

        await _context.SaveChangesAsync();
        return MapToDto(listing);
    }

    public async Task<ItemListingDto?> AttachExistingAsync(int showcaseId, int listingId)
    {
        var showcaseExists = await _context.Showcases.AnyAsync(x => x.Id == showcaseId);
        var listing = await _context.ItemListings.FindAsync(listingId);

        if (!showcaseExists || listing == null)
        {
            return null;
        }

        var alreadyLinked = await _context.ShowcaseItemListings
            .AnyAsync(x => x.ShowcaseId == showcaseId && x.ItemListingId == listingId);

        if (!alreadyLinked)
        {
            _context.ShowcaseItemListings.Add(new ShowcaseItemListing
            {
                ShowcaseId = showcaseId,
                ItemListingId = listingId
            });

            await _context.SaveChangesAsync();
        }

        return MapToDto(listing);
    }

    public async Task<bool> UpdateAsync(int showcaseId, int id, UpdateItemListingDto dto)
    {
        var isLinked = await _context.ShowcaseItemListings
            .AnyAsync(x => x.ShowcaseId == showcaseId && x.ItemListingId == id);

        if (!isLinked)
        {
            return false;
        }

        var listing = await _context.ItemListings.FindAsync(id);

        if (listing == null)
        {
            return false;
        }

        listing.Title = dto.Title;
        listing.Price = dto.Price;
        listing.Description = dto.Description;
        listing.ImageUrl = dto.ImageUrl;
        listing.StockQuantity = dto.StockQuantity;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int showcaseId, int id)
    {
        var link = await _context.ShowcaseItemListings
            .FirstOrDefaultAsync(x => x.ShowcaseId == showcaseId && x.ItemListingId == id);

        if (link == null)
        {
            return false;
        }

        _context.ShowcaseItemListings.Remove(link);
        await _context.SaveChangesAsync();
        return true;
    }

    private static ItemListingDto MapToDto(ItemListing listing)
    {
        return new ItemListingDto
        {
            Id = listing.Id,
            Title = listing.Title,
            Price = listing.Price,
            Description = listing.Description,
            ImageUrl = listing.ImageUrl,
            StockQuantity = listing.StockQuantity
        };
    }
}
