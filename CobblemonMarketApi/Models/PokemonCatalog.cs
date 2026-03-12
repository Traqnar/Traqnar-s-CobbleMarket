using System.ComponentModel.DataAnnotations;

namespace CobblemonMarketApi.Models;

public class PokemonCatalog
{
    [Key]
    public int PokedexNumber { get; set; }

    public string EnglishName { get; set; } = string.Empty;
    public string FrenchName { get; set; } = string.Empty;
    public string DefaultImageUrl { get; set; } = string.Empty;

    public List<PokemonAbility> PokemonAbilities { get; set; } = new();
    public List<PokemonFormCatalog> PokemonForms { get; set; } = new();
}
