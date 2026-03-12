using System.ComponentModel.DataAnnotations;

namespace CobblemonMarketApi.Dtos.PokemonListings
{
    public class UpdatePokemonListingDto
    {
        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = "";

        [Range(0, int.MaxValue)]
        public int Price { get; set; }

        [MaxLength(500)]
        public string Description { get; set; } = "";

        [Range(1, 9999)]
        public int PokedexNumber { get; set; }

        [Required]
        [MaxLength(50)]
        public string PokemonName { get; set; } = "";

        [MaxLength(80)]
        public string Form { get; set; } = "";

        [Range(1, 100)]
        public int Level { get; set; }

        [Required]
        [MaxLength(50)]
        public string Nature { get; set; } = "";

        [Required]
        [MaxLength(50)]
        public string Ability { get; set; } = "";

        public bool IsHiddenAbility { get; set; }

        [Required]
        [MaxLength(20)]
        public string Gender { get; set; } = "";

        public bool IsShiny { get; set; }

        [Url]
        public string? CustomImageUrl { get; set; }

        [Range(0, 31)]
        public int HpIv { get; set; }

        [Range(0, 31)]
        public int AttackIv { get; set; }

        [Range(0, 31)]
        public int DefenseIv { get; set; }

        [Range(0, 31)]
        public int SpecialAttackIv { get; set; }

        [Range(0, 31)]
        public int SpecialDefenseIv { get; set; }

        [Range(0, 31)]
        public int SpeedIv { get; set; }
    }
}
