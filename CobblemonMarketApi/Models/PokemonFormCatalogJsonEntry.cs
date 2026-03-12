namespace CobblemonMarketApi.Models;

public class PokemonFormCatalogJsonEntry
{
    public int PokedexNumber { get; set; }
    public string FormKey { get; set; } = string.Empty;
    public string ApiName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string DefaultImageUrl { get; set; } = string.Empty;
    public string? ShinyImageUrl { get; set; }
}
