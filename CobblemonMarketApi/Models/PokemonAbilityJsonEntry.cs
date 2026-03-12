namespace CobblemonMarketApi.Models;

public class PokemonAbilityJsonEntry
{
    public int PokedexNumber { get; set; }
    public string PokemonName { get; set; } = string.Empty;
    public List<PokemonAbilityJsonAbility> Abilities { get; set; } = new();
}

public class PokemonAbilityJsonAbility
{
    public string Name { get; set; } = string.Empty;
    public bool IsHidden { get; set; }
    public int Slot { get; set; }
}