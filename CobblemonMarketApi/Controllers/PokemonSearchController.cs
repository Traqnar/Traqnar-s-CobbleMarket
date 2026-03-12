using CobblemonMarketApi.Data;
using CobblemonMarketApi.Data.StaticData;
using CobblemonMarketApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PokemonSearchController : ControllerBase
{
    private readonly IPokemonSearchService _service;
    private readonly AppDbContext _context;

    public PokemonSearchController(IPokemonSearchService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("autocomplete")]
    public async Task<IActionResult> Autocomplete([FromQuery] string query)
    {
        var results = await _service.AutocompleteAsync(query);
        return Ok(results);
    }

    [HttpGet("by-name/{name}")]
    public async Task<IActionResult> GetByName(string name)
    {
        var result = await _service.GetByNameAsync(name);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpGet("natures/search")]
    public IActionResult SearchNatures([FromQuery] string? q, [FromQuery] int take = 10)
    {
        var query = (q ?? string.Empty).Trim();
        var safeTake = Math.Clamp(take, 1, 25);

        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(NatureList.All.Take(safeTake));
        }

        var results = NatureList.All
            .Where(x => x.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(x => x.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(x => x)
            .Take(safeTake)
            .ToList();

        return Ok(results);
    }

    [HttpGet("abilities/search")]
    public async Task<IActionResult> SearchAbilities([FromQuery] string? q, [FromQuery] int take = 10)
    {
        var query = (q ?? string.Empty).Trim();
        var safeTake = Math.Clamp(take, 1, 25);

        var results = await _context.AbilityCatalog
            .AsNoTracking()
            .Where(x => string.IsNullOrWhiteSpace(query) ||
                        x.Name.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(x => x.Name.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(x => x.Name)
            .Take(safeTake)
            .Select(x => x.Name)
            .ToListAsync();

        return Ok(results);
    }

    [HttpGet("abilities/by-pokemon/{pokedexNumber:int}")]
    public async Task<IActionResult> SearchAbilitiesByPokemon(
        int pokedexNumber,
        [FromQuery] string? q,
        [FromQuery] int take = 10)
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
                name = x.AbilityCatalog.Name,
                x.IsHidden,
                x.Slot
            })
            .ToList();

        return Ok(filtered);
    }
}
