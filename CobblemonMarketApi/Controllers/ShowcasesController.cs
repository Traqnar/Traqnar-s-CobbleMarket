using CobblemonMarketApi.Data;
using CobblemonMarketApi.Dtos.ItemListings;
using CobblemonMarketApi.Dtos.PokemonListings;
using CobblemonMarketApi.Dtos.Showcases;
using CobblemonMarketApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/showcases")]
public class ShowcasesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShowcasesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShowcaseDto>>> GetAll()
    {
        var showcases = await _context.Showcases
            .AsNoTracking()
            .Include(x => x.PokemonListingLinks)
            .ThenInclude(x => x.PokemonListing)
            .Include(x => x.ItemListingLinks)
            .ThenInclude(x => x.ItemListing)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ToListAsync();

        return Ok(showcases.Select(MapToDto));
    }

    [HttpGet("{showcaseId:int}")]
    public async Task<ActionResult<ShowcaseDto>> GetById(int showcaseId)
    {
        var showcase = await _context.Showcases
            .AsNoTracking()
            .Include(x => x.PokemonListingLinks)
            .ThenInclude(x => x.PokemonListing)
            .Include(x => x.ItemListingLinks)
            .ThenInclude(x => x.ItemListing)
            .FirstOrDefaultAsync(x => x.Id == showcaseId);

        if (showcase == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(showcase));
    }

    [HttpPost]
    public async Task<ActionResult<ShowcaseDto>> Create(CreateShowcaseDto dto)
    {
        var showcase = new Showcase
        {
            Name = dto.Name,
            Description = dto.Description,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _context.Showcases.Add(showcase);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { showcaseId = showcase.Id }, MapToDto(showcase));
    }

    [HttpPut("{showcaseId:int}")]
    public async Task<IActionResult> Update(int showcaseId, UpdateShowcaseDto dto)
    {
        var showcase = await _context.Showcases
            .FirstOrDefaultAsync(x => x.Id == showcaseId);

        if (showcase == null)
        {
            return NotFound();
        }

        showcase.Name = dto.Name;
        showcase.Description = dto.Description;
        showcase.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{showcaseId:int}")]
    public async Task<IActionResult> Delete(int showcaseId)
    {
        var showcase = await _context.Showcases
            .FirstOrDefaultAsync(x => x.Id == showcaseId);

        if (showcase == null)
        {
            return NotFound();
        }

        _context.Showcases.Remove(showcase);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static ShowcaseDto MapToDto(Showcase showcase)
    {
        return new ShowcaseDto
        {
            Id = showcase.Id,
            Name = showcase.Name,
            Description = showcase.Description,
            CreatedAtUtc = showcase.CreatedAtUtc,
            UpdatedAtUtc = showcase.UpdatedAtUtc,
            PokemonListings = showcase.PokemonListingLinks.Select(x => x.PokemonListing).Select(MapPokemon),
            ItemListings = showcase.ItemListingLinks.Select(x => x.ItemListing).Select(MapItem)
        };
    }

    private static PokemonListingDto MapPokemon(PokemonListing x)
    {
        return new PokemonListingDto
        {
            Id = x.Id,
            Uuid = x.Uuid,
            Form = x.Form,
            Title = x.Title,
            Price = x.Price,
            Description = x.Description,
            PokedexNumber = x.PokedexNumber,
            PokemonName = x.PokemonName,
            Level = x.Level,
            Nature = x.Nature,
            Ability = x.Ability,
            IsHiddenAbility = x.IsHiddenAbility,
            Gender = x.Gender,
            IsShiny = x.IsShiny,
            IsRadiant = x.IsRadiant,
            DefaultImageUrl = x.DefaultImageUrl,
            CustomImageUrl = x.CustomImageUrl,
            HpIv = x.HpIv,
            AttackIv = x.AttackIv,
            DefenseIv = x.DefenseIv,
            SpecialAttackIv = x.SpecialAttackIv,
            SpecialDefenseIv = x.SpecialDefenseIv,
            SpeedIv = x.SpeedIv,
            TotalIvPercentage = x.TotalIvPercentage
        };
    }

    private static ItemListingDto MapItem(ItemListing x)
    {
        return new ItemListingDto
        {
            Id = x.Id,
            Title = x.Title,
            Price = x.Price,
            Description = x.Description,
            ImageUrl = x.ImageUrl,
            StockQuantity = x.StockQuantity
        };
    }
}
