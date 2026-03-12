namespace CobblemonMarketApi.Dtos.PokemonListings;

public class ImportPcPokemonListingsResultDto
{
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public int DuplicateUuidCount { get; set; }
    public int UnknownSpeciesCount { get; set; }
}
