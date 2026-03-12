using CobblemonMarketApi.Dtos.ItemListings;
using CobblemonMarketApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/showcases/{showcaseId:int}/item-listings")]
public class ItemListingsController : ControllerBase
{
    private readonly IItemListingService _service;

    public ItemListingsController(IItemListingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ItemListingDto>>> GetAll(int showcaseId)
    {
        var listings = await _service.GetAllByShowcaseAsync(showcaseId);
        return Ok(listings);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItemListingDto>> GetById(int showcaseId, int id)
    {
        var listing = await _service.GetByIdAsync(showcaseId, id);

        if (listing == null)
        {
            return NotFound();
        }

        return Ok(listing);
    }

    [HttpPost]
    public async Task<ActionResult<ItemListingDto>> Create(int showcaseId, CreateItemListingDto dto)
    {
        var createdListing = await _service.CreateAsync(showcaseId, dto);

        if (createdListing == null)
        {
            return NotFound($"Showcase {showcaseId} introuvable.");
        }

        return CreatedAtAction(nameof(GetById), new { showcaseId, id = createdListing.Id }, createdListing);
    }

    [HttpPost("link/{listingId:int}")]
    public async Task<ActionResult<ItemListingDto>> LinkExisting(int showcaseId, int listingId)
    {
        var linkedListing = await _service.AttachExistingAsync(showcaseId, listingId);

        if (linkedListing == null)
        {
            return NotFound();
        }

        return Ok(linkedListing);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int showcaseId, int id, UpdateItemListingDto dto)
    {
        var updated = await _service.UpdateAsync(showcaseId, id, dto);

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
}
