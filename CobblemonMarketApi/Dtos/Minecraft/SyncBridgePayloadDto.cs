namespace CobblemonMarketApi.Dtos.Minecraft;

public class SyncBridgePayloadDto
{
    public string Action { get; init; } = "sync_party_pc_tpaccept";
    public string RequestId { get; init; } = string.Empty;
    public long ExecuteAtEpochMs { get; init; }
    public int PartySlotId { get; init; }
}
