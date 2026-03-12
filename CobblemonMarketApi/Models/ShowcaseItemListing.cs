namespace CobblemonMarketApi.Models;

public class ShowcaseItemListing
{
    public int ShowcaseId { get; set; }
    public Showcase Showcase { get; set; } = null!;

    public int ItemListingId { get; set; }
    public ItemListing ItemListing { get; set; } = null!;
}
