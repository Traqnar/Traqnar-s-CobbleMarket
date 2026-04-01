using CobblemonMarketApi.Dtos.Minecraft;

namespace CobblemonMarketApi.Services;

public interface IMinecraftBridgeService
{
    Task<MinecraftCommandResultDto> ExportAllPcAsync(
        string requestedBy,
        string? instance = null,
        CancellationToken cancellationToken = default);
    Task<SyncTransferAndTpacceptResponseDto> SyncTransferAndTpacceptAsync(
        SyncTransferAndTpacceptRequestDto input,
        CancellationToken cancellationToken = default);
}
