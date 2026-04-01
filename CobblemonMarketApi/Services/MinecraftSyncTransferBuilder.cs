using CobblemonMarketApi.Dtos.Minecraft;

namespace CobblemonMarketApi.Services;

public static class MinecraftSyncTransferBuilder
{
    public const string SyncAction = "sync_party_pc_tpaccept";
    public const int DefaultLeadDelayMs = 1200;
    public const int MaxLeadDelayMs = 60000;
    public const int MinPartySlotId = 0;
    public const int MaxPartySlotId = 5;

    public static SyncBridgePayloadDto BuildPayload(
        int partySlotId,
        int leadDelayMs,
        string? requestId,
        long nowEpochMs)
    {
        var normalizedRequestId = string.IsNullOrWhiteSpace(requestId)
            ? Guid.NewGuid().ToString("D")
            : requestId.Trim();

        return new SyncBridgePayloadDto
        {
            Action = SyncAction,
            RequestId = normalizedRequestId,
            ExecuteAtEpochMs = nowEpochMs + leadDelayMs,
            PartySlotId = partySlotId
        };
    }

    public static Dictionary<string, string[]> ValidateInput(SyncTransferAndTpacceptRequestDto? input)
    {
        var details = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        if (input is null)
        {
            details["body"] = ["Request body is required."];
            return details;
        }

        if (input.PartySlotId < MinPartySlotId || input.PartySlotId > MaxPartySlotId)
        {
            details["partySlotId"] = [$"partySlotId must be an integer between {MinPartySlotId} and {MaxPartySlotId}."];
        }

        if (input.LeadDelayMs is not null &&
            (input.LeadDelayMs.Value < 0 || input.LeadDelayMs.Value > MaxLeadDelayMs))
        {
            details["leadDelayMs"] = [$"leadDelayMs must be an integer between 0 and {MaxLeadDelayMs}."];
        }

        return details;
    }
}
