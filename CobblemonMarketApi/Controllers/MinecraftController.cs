using CobblemonMarketApi.Dtos.Minecraft;
using CobblemonMarketApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/minecraft")]
public class MinecraftController : ControllerBase
{
    private readonly IMinecraftBridgeService _minecraftBridgeService;

    public MinecraftController(IMinecraftBridgeService minecraftBridgeService)
    {
        _minecraftBridgeService = minecraftBridgeService;
    }

    [HttpPost("exportallpc")]
    public async Task<ActionResult<MinecraftCommandResultDto>> ExportAllPc(CancellationToken cancellationToken)
    {
        var requestedBy = User?.Identity?.Name ?? "api";
        var result = await _minecraftBridgeService.ExportAllPcAsync(requestedBy, cancellationToken);

        return StatusCode(result.StatusCode, result);
    }
}
