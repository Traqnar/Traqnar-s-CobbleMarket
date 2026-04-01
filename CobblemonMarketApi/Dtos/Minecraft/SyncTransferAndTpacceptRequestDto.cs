namespace CobblemonMarketApi.Dtos.Minecraft;

public class SyncTransferAndTpacceptRequestDto
{
    public int PartySlotId { get; set; }
    public int? LeadDelayMs { get; set; }
    public string? RequestId { get; set; }
}
