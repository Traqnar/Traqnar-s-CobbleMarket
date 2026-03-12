namespace CobblemonMarketApi.Dtos.ItemListings;

public class ItemListingDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public int Price { get; set; }
    public string Description { get; set; } = "";
    public string ImageUrl { get; set; } = "";
    public int StockQuantity { get; set; }
}
