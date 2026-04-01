namespace CobblemonMarketApi.Dtos.Minecraft;

public class SyncBridgeTargetResultDto
{
    public int? Status { get; init; }
    public object? Body { get; init; }
    public long LatencyMs { get; init; }
    public string? Error { get; init; }
}
