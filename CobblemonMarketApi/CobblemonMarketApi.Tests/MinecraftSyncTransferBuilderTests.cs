using CobblemonMarketApi.Dtos.Minecraft;
using CobblemonMarketApi.Services;

namespace CobblemonMarketApi.Tests;

public class MinecraftSyncTransferBuilderTests
{
    [Fact]
    public void BuildPayload_UsesExpectedFields()
    {
        const long nowEpochMs = 1_710_000_000_000;
        const int leadDelayMs = 1200;
        const int partySlotId = 3;
        const string requestId = "2f486b4e-df76-4424-8ffc-f9fd3f31a9ea";

        var payload = MinecraftSyncTransferBuilder.BuildPayload(
            partySlotId,
            leadDelayMs,
            requestId,
            nowEpochMs);

        Assert.Equal(MinecraftSyncTransferBuilder.SyncAction, payload.Action);
        Assert.Equal(requestId, payload.RequestId);
        Assert.Equal(nowEpochMs + leadDelayMs, payload.ExecuteAtEpochMs);
        Assert.Equal(partySlotId, payload.PartySlotId);
    }

    [Fact]
    public void ValidateInput_ReturnsError_WhenPartySlotIsOutOfRange()
    {
        var input = new SyncTransferAndTpacceptRequestDto
        {
            PartySlotId = 7,
            LeadDelayMs = 1200
        };

        var details = MinecraftSyncTransferBuilder.ValidateInput(input);

        Assert.True(details.ContainsKey("partySlotId"));
        Assert.NotEmpty(details["partySlotId"]);
    }
}
