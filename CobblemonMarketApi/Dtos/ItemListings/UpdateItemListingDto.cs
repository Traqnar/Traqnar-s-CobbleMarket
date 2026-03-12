using System.ComponentModel.DataAnnotations;

namespace CobblemonMarketApi.Dtos.ItemListings
{
    public class UpdateItemListingDto
    {
        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = "";

        [Range(0, int.MaxValue)]
        public int Price { get; set; }

        [MaxLength(500)]
        public string Description { get; set; } = "";

        [Required]
        [Url]
        public string ImageUrl { get; set; } = "";

        [Range(0, int.MaxValue)]
        public int StockQuantity { get; set; }
    }
}
