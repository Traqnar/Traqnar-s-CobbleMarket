namespace CobblemonMarketApi.Dtos.Minecraft;

public class SyncTransferAndTpacceptResponseDto
{
    public bool Ok { get; init; }
    public string RequestId { get; init; } = string.Empty;
    public long ExecuteAtEpochMs { get; init; }
    public SyncBridgeTargetResultDto A { get; init; } = new();
    public SyncBridgeTargetResultDto B { get; init; } = new();
}
