namespace CobblemonMarketApi.Models;

public class PokemonAbility
{
    public int Id { get; set; }

    public int PokedexNumber { get; set; }
    public PokemonCatalog PokemonCatalog { get; set; } = null!;

    public int AbilityCatalogId { get; set; }
    public AbilityCatalog AbilityCatalog { get; set; } = null!;

    public bool IsHidden { get; set; }
    public int Slot { get; set; }
}