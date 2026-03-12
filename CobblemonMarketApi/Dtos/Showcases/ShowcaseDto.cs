using CobblemonMarketApi.Dtos.ItemListings;
using CobblemonMarketApi.Dtos.PokemonListings;

namespace CobblemonMarketApi.Dtos.Showcases;

public class ShowcaseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public IEnumerable<PokemonListingDto> PokemonListings { get; set; } = [];
    public IEnumerable<ItemListingDto> ItemListings { get; set; } = [];
}
