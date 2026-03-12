namespace CobblemonMarketApi.Dtos.PokemonSearch;

    public class PokemonAutocompleteDto
    {
        public string EnglishName { get; set; } = "";
        public string FrenchName { get; set; } = "";
        public int PokedexNumber { get; set; }
        public string ImageUrl { get; set; } = "";
        public List<string> Forms { get; set; } = new();
    }
