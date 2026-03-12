namespace CobblemonMarketApi.Models;

public class PokemonCatalogSeed
{
    public int PokedexNumber { get; set; }
    public string EnglishName { get; set; } = "";
    public string FrenchName { get; set; } = "";
    public string DefaultImageUrl { get; set; } = "";
}