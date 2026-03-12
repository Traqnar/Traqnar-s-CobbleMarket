using CobblemonMarketApi.Dtos.Minecraft;

namespace CobblemonMarketApi.Services;

public interface IMinecraftBridgeService
{
    Task<MinecraftCommandResultDto> ExportAllPcAsync(string requestedBy, CancellationToken cancellationToken = default);
}
