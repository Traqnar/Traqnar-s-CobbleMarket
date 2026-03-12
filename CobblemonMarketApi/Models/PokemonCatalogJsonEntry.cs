namespace CobblemonShowcase.Api.Models;

public class PokemonCatalogJsonEntry
{
    public int PokedexNumber { get; set; }
    public string EnglishName { get; set; } = string.Empty;
    public string FrenchName { get; set; } = string.Empty;
    public string DefaultImageUrl { get; set; } = string.Empty;
}