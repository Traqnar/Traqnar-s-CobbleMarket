namespace CobblemonMarketApi.Dtos.PokemonSearch;

public class PokemonDetailsDto
{
    public string Name { get; set; } = "";
    public int PokedexNumber { get; set; }
    public string ImageUrl { get; set; } = "";
    public List<string> Abilities { get; set; } = new();
    public List<string> Forms { get; set; } = new();
}
