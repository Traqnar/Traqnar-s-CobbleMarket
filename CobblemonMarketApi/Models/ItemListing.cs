namespace CobblemonMarketApi.Models;

public class ItemListing : BaseListing
{
    public string ImageUrl { get; set; } = "";
    public int StockQuantity { get; set; }

    public ICollection<ShowcaseItemListing> ShowcaseLinks { get; set; } = new List<ShowcaseItemListing>();
}
