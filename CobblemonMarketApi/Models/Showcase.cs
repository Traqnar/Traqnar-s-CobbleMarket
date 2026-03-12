namespace CobblemonMarketApi.Models;

public class Showcase
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ShowcasePokemonListing> PokemonListingLinks { get; set; } = new List<ShowcasePokemonListing>();
    public ICollection<ShowcaseItemListing> ItemListingLinks { get; set; } = new List<ShowcaseItemListing>();
}
