using CobblemonMarketApi.Dtos.PokemonListings;
using CobblemonMarketApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/showcases/{showcaseId:int}/pokemon-listings")]
public class PokemonListingsController : ControllerBase
{
    private readonly IPokemonListingService _service;
    private readonly IImportNotificationService _notifications;

    public PokemonListingsController(
        IPokemonListingService service,
        IImportNotificationService notifications)
    {
        _service = service;
        _notifications = notifications;
    }

    [HttpGet("/api/pokemon-listings")]
    public async Task<ActionResult<IEnumerable<PokemonListingDto>>> GetAllGlobal()
    {
        var listings = await _service.GetAllAsync();
        return Ok(listings);
    }

    [HttpPost("/api/pokemon-listings")]
    public async Task<ActionResult<PokemonListingDto>> CreateGlobal(CreatePokemonListingDto dto)
    {
        var createdListing = await _service.CreateGlobalAsync(dto);
        return Ok(createdListing);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PokemonListingDto>>> GetAll(int showcaseId)
    {
        var listings = await _service.GetAllByShowcaseAsync(showcaseId);
        return Ok(listings);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PokemonListingDto>> GetById(int showcaseId, int id)
    {
        var listing = await _service.GetByIdAsync(showcaseId, id);

        if (listing == null)
        {
            return NotFound();
        }

        return Ok(listing);
    }

    [HttpPost]
    public async Task<ActionResult<PokemonListingDto>> Create(int showcaseId, CreatePokemonListingDto dto)
    {
        var createdListing = await _service.CreateAsync(showcaseId, dto);

        if (createdListing == null)
        {
            return NotFound($"Showcase {showcaseId} introuvable.");
        }

        return CreatedAtAction(nameof(GetById), new { showcaseId, id = createdListing.Id }, createdListing);
    }

    [HttpPost("/api/pokemon-listings/import-pc")]
    public async Task<ActionResult<ImportPcPokemonListingsResultDto>> ImportPc(ImportPcExportDto dto)
    {
        var result = await _service.ImportFromPcExportAsync(dto);
        return Ok(result);
    }

    [HttpGet("/api/pokemon-listings/import-events")]
    public async Task ImportEvents()
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        var queue = new ConcurrentQueue<string>();
        var signal = new SemaphoreSlim(0);

        var subscriptionId = _notifications.Subscribe(message =>
        {
            queue.Enqueue(message);
            signal.Release();
        });

        try
        {
            await Response.WriteAsync(": connected\n\n");
            await Response.Body.FlushAsync();

            while (!HttpContext.RequestAborted.IsCancellationRequested)
            {
                await signal.WaitAsync(HttpContext.RequestAborted);

                while (queue.TryDequeue(out var message))
                {
                    await Response.WriteAsync($"event: import-pc\n");
                    await Response.WriteAsync($"data: {message}\n\n");
                    await Response.Body.FlushAsync();
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected.
        }
        finally
        {
            _notifications.Unsubscribe(subscriptionId);
            signal.Dispose();
        }
    }

    [HttpPost("link/{listingId:int}")]
    public async Task<ActionResult<PokemonListingDto>> LinkExisting(int showcaseId, int listingId)
    {
        var linkedListing = await _service.AttachExistingAsync(showcaseId, listingId);

        if (linkedListing == null)
        {
            return NotFound();
        }

        return Ok(linkedListing);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int showcaseId, int id, UpdatePokemonListingDto dto)
    {
        var updated = await _service.UpdateAsync(showcaseId, id, dto);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPut("/api/pokemon-listings/{id:int}")]
    public async Task<IActionResult> UpdateGlobal(int id, UpdatePokemonListingDto dto)
    {
        var updated = await _service.UpdateGlobalAsync(id, dto);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int showcaseId, int id)
    {
        var deleted = await _service.DeleteAsync(showcaseId, id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpDelete("/api/pokemon-listings/{id:int}")]
    public async Task<IActionResult> DeleteGlobal(int id)
    {
        var deleted = await _service.DeleteGlobalAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
