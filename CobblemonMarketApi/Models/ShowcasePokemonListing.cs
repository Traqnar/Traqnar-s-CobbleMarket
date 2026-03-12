namespace CobblemonMarketApi.Models;

public class ShowcasePokemonListing
{
    public int ShowcaseId { get; set; }
    public Showcase Showcase { get; set; } = null!;

    public int PokemonListingId { get; set; }
    public PokemonListing PokemonListing { get; set; } = null!;
}
