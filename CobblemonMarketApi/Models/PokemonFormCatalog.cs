using System.ComponentModel.DataAnnotations;

namespace CobblemonMarketApi.Models;

public class PokemonFormCatalog
{
    public int Id { get; set; }

    public int PokedexNumber { get; set; }
    public PokemonCatalog PokemonCatalog { get; set; } = null!;

    [MaxLength(80)]
    public string FormKey { get; set; } = string.Empty;

    [MaxLength(120)]
    public string ApiName { get; set; } = string.Empty;

    [MaxLength(120)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string DefaultImageUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? ShinyImageUrl { get; set; }
}
