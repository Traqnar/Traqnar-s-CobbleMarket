using CobblemonMarketApi.Data.StaticData;
using Microsoft.AspNetCore.Mvc;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/natures")]
public class NatureController : ControllerBase
{
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string? q, [FromQuery] int take = 10)
    {
        var query = (q ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(NatureList.All.Take(Math.Clamp(take, 1, 25)));
        }

        var results = NatureList.All
            .Where(x => x.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(x => x.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(x => x)
            .Take(Math.Clamp(take, 1, 25))
            .ToList();

        return Ok(results);
    }
}