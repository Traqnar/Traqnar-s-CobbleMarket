using CobblemonMarketApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/abilities")]
public class AbilityController : ControllerBase
{
    private readonly AppDbContext _context;

    public AbilityController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("by-pokemon/{pokedexNumber:int}")]
    public async Task<IActionResult> GetByPokemon(int pokedexNumber, [FromQuery] string? q, [FromQuery] int take = 10)
    {
        var query = (q ?? string.Empty).Trim();
        var safeTake = Math.Clamp(take, 1, 25);

        var items = await _context.PokemonAbilities
            .AsNoTracking()
            .Include(x => x.AbilityCatalog)
            .Where(x => x.PokedexNumber == pokedexNumber)
            .ToListAsync();

        var filtered = items
            .Where(x => string.IsNullOrWhiteSpace(query) ||
                        x.AbilityCatalog.Name.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(x => x.AbilityCatalog.Name.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(x => x.IsHidden ? 1 : 0)
            .ThenBy(x => x.Slot)
            .Take(safeTake)
            .Select(x => new
            {
                x.AbilityCatalogId,
                name = x.AbilityCatalog.Name,
                x.IsHidden,
                x.Slot
            })
            .ToList();

        return Ok(filtered);
    }
}