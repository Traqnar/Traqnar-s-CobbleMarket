using System.ComponentModel.DataAnnotations;

namespace CobblemonMarketApi.Dtos.Showcases;

public class CreateShowcaseDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = "";

    [MaxLength(500)]
    public string? Description { get; set; }
}
