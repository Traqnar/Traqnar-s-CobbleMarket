namespace CobblemonMarketApi.Dtos.PokemonListings;

public class PokemonListingDto
{
    public int Id { get; set; }
    public string Uuid { get; set; } = "";
    public string Form { get; set; } = "";
    public string Title { get; set; } = "";
    public int Price { get; set; }
    public string Description { get; set; } = "";
    public int PokedexNumber { get; set; }
    public string PokemonName { get; set; } = "";
    public int Level { get; set; }
    public string Nature { get; set; } = "";
    public string Ability { get; set; } = "";
    public bool IsHiddenAbility { get; set; }
    public string Gender { get; set; } = "";
    public bool IsShiny { get; set; }
    public bool IsRadiant { get; set; }
    public string DefaultImageUrl { get; set; } = "";
    public string? CustomImageUrl { get; set; }
    public int HpIv { get; set; }
    public int AttackIv { get; set; }
    public int DefenseIv { get; set; }
    public int SpecialAttackIv { get; set; }
    public int SpecialDefenseIv { get; set; }
    public int SpeedIv { get; set; }
    public double TotalIvPercentage { get; set; }
}
