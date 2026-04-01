using CobblemonMarketApi.Dtos.Minecraft;
using CobblemonMarketApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CobblemonMarketApi.Controllers;

[ApiController]
[Route("api/mc")]
[Route("api/minecraft")]
public class MinecraftController : ControllerBase
{
    private readonly IMinecraftBridgeService _minecraftBridgeService;
    private readonly ILogger<MinecraftController> _logger;

    public MinecraftController(
        IMinecraftBridgeService minecraftBridgeService,
        ILogger<MinecraftController> logger)
    {
        _minecraftBridgeService = minecraftBridgeService;
        _logger = logger;
    }

    [HttpPost("exportallpc")]
    public async Task<ActionResult<MinecraftCommandResultDto>> ExportAllPc(
        [FromQuery] string? instance,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(instance) &&
            !string.Equals(instance, "A", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(instance, "B", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                ok = false,
                error = "Invalid instance. Allowed values: A or B."
            });
        }

        var requestedBy = User?.Identity?.Name ?? "api";
        var result = await _minecraftBridgeService.ExportAllPcAsync(requestedBy, instance, cancellationToken);

        return StatusCode(result.StatusCode, result);
    }

    [HttpPost("sync-transfer-and-tpaccept")]
    public async Task<IActionResult> SyncTransferAndTpaccept(
        [FromBody] SyncTransferAndTpacceptRequestDto? input,
        CancellationToken cancellationToken)
    {
        var details = MinecraftSyncTransferBuilder.ValidateInput(input);
        if (details.Count > 0)
        {
            return BadRequest(new
            {
                ok = false,
                error = "Invalid request payload.",
                details
            });
        }

        var result = await _minecraftBridgeService.SyncTransferAndTpacceptAsync(input!, cancellationToken);
        return Ok(result);
    }

    [HttpPost("/api/bridge/sync-party-pc-and-tpaccept")]
    public async Task<IActionResult> SyncPartyPcAndTpacceptAck(
        [FromBody] SyncTransferAndTpacceptRequestDto? input,
        CancellationToken cancellationToken)
    {
        var requestId = string.IsNullOrWhiteSpace(input?.RequestId)
            ? Guid.NewGuid().ToString("D")
            : input.RequestId.Trim();

        _logger.LogInformation(
            "sync.ack.received requestId={RequestId} endpoint={Endpoint}",
            requestId,
            "/api/bridge/sync-party-pc-and-tpaccept");

        var details = MinecraftSyncTransferBuilder.ValidateInput(input);
        if (details.Count > 0)
        {
            var invalidPayload = new
            {
                success = false,
                requestId,
                accepted = false,
                aStatus = (int?)null,
                bStatus = (int?)null,
                message = "Invalid request payload."
            };

            _logger.LogWarning(
                "sync.ack.rejected requestId={RequestId} reason=invalid_payload",
                requestId);

            return BadRequest(new
            {
                invalidPayload.success,
                invalidPayload.requestId,
                invalidPayload.accepted,
                invalidPayload.aStatus,
                invalidPayload.bStatus,
                invalidPayload.message,
                details
            });
        }

        var dispatchResult = await _minecraftBridgeService.SyncTransferAndTpacceptAsync(input!, cancellationToken);
        var httpStatus = ResolveHttpStatus(dispatchResult);
        var accepted = httpStatus is >= 200 and < 300;
        var message = BuildAckMessage(dispatchResult, accepted);

        _logger.LogInformation(
            "sync.ack.final requestId={RequestId} accepted={Accepted} httpStatus={HttpStatus} aStatus={AStatus} bStatus={BStatus} message={Message}",
            dispatchResult.RequestId,
            accepted,
            httpStatus,
            dispatchResult.A.Status,
            dispatchResult.B.Status,
            message);

        return StatusCode(httpStatus, new
        {
            success = accepted,
            requestId = dispatchResult.RequestId,
            accepted,
            aStatus = dispatchResult.A.Status,
            bStatus = dispatchResult.B.Status,
            message
        });
    }

    private static int ResolveHttpStatus(SyncTransferAndTpacceptResponseDto result)
    {
        if (result.Ok)
        {
            return StatusCodes.Status200OK;
        }

        var errorA = result.A.Error ?? string.Empty;
        var errorB = result.B.Error ?? string.Empty;
        var hasTimeout =
            errorA.Contains("timeout", StringComparison.OrdinalIgnoreCase) ||
            errorB.Contains("timeout", StringComparison.OrdinalIgnoreCase);

        if (hasTimeout)
        {
            return StatusCodes.Status504GatewayTimeout;
        }

        var hasNoStatus = !result.A.Status.HasValue || !result.B.Status.HasValue;
        if (hasNoStatus)
        {
            return StatusCodes.Status503ServiceUnavailable;
        }

        if (result.A.Status is >= 500 || result.B.Status is >= 500)
        {
            return StatusCodes.Status502BadGateway;
        }

        if (result.A.Status is >= 400 || result.B.Status is >= 400)
        {
            return StatusCodes.Status424FailedDependency;
        }

        return StatusCodes.Status409Conflict;
    }

    private static string BuildAckMessage(SyncTransferAndTpacceptResponseDto result, bool accepted)
    {
        if (accepted)
        {
            return "Sync accepted and dispatched to both bridges (A and B).";
        }

        var aDetail = DescribeTarget("A", result.A);
        var bDetail = DescribeTarget("B", result.B);
        return $"Sync not accepted: {aDetail}; {bDetail}.";
    }

    private static string DescribeTarget(string role, SyncBridgeTargetResultDto target)
    {
        if (!string.IsNullOrWhiteSpace(target.Error))
        {
            return $"role {role} error={target.Error}";
        }

        if (!target.Status.HasValue)
        {
            return $"role {role} status=none";
        }

        return $"role {role} status={target.Status.Value}";
    }
}
