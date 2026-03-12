namespace CobblemonMarketApi.Models;

public class BaseListing
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public int Price { get; set; }
    public string Description { get; set; } = "";
}
