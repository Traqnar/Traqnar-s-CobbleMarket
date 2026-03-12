using System.ComponentModel.DataAnnotations;

namespace CobblemonMarketApi.Models;

public class AbilityCatalog
{
    [Key]
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<PokemonAbility> PokemonAbilities { get; set; } = new();
}