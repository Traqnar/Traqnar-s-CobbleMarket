using System.Text;
using System.Text.Json;
using CobblemonMarketApi.Dtos.Minecraft;
using CobblemonMarketApi.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CobblemonMarketApi.Services;

public class MinecraftBridgeService : IMinecraftBridgeService
{
    private const string SyncEndpointPath = "/api/bridge/sync-party-pc-and-tpaccept";
    private const string BridgeAUrl = "http://127.0.0.1:5149";
    private const string BridgeBUrl = "http://127.0.0.1:5150";
    private const int SyncTimeoutMs = 3500;
    private const int MaxSyncRetries = 1;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MinecraftBridgeService> _logger;
    private readonly MinecraftBridgeOptions _options;

    public MinecraftBridgeService(
        IHttpClientFactory httpClientFactory,
        IOptions<MinecraftBridgeOptions> options,
        ILogger<MinecraftBridgeService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<MinecraftCommandResultDto> ExportAllPcAsync(
        string requestedBy,
        string? instance = null,
        CancellationToken cancellationToken = default)
    {
        var requestId = Guid.NewGuid().ToString("D");
        var targetInstance = string.Equals(instance?.Trim(), "B", StringComparison.OrdinalIgnoreCase)
            ? "B"
            : "A";
        var baseUrl = targetInstance == "B"
            ? BridgeBUrl
            : BridgeAUrl;

        var timeout = Math.Clamp(_options.TimeoutSeconds, 1, 120);
        var endpointPath = string.IsNullOrWhiteSpace(_options.ExportAllPcPath)
            ? "/api/bridge/export-all-pc"
            : _options.ExportAllPcPath.Trim();

        var client = _httpClientFactory.CreateClient(nameof(MinecraftBridgeService));
        client.Timeout = TimeSpan.FromSeconds(timeout);
        client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");

        var payload = new
        {
            requestedBy,
            requestId
        };

        var requestJson = JsonSerializer.Serialize(payload, JsonOptions);
        using var content = new StringContent(requestJson, Encoding.UTF8, "application/json");

        try
        {
            using var response = await client.PostAsync(endpointPath.TrimStart('/'), content, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            return new MinecraftCommandResultDto
            {
                Success = response.IsSuccessStatusCode,
                StatusCode = (int)response.StatusCode,
                RequestId = requestId,
                Message = response.IsSuccessStatusCode
                    ? $"Commande exportallpc envoyee vers l'instance {targetInstance}."
                    : $"Le bridge Minecraft (instance {targetInstance}) a retourne une erreur.",
                RawResponse = string.IsNullOrWhiteSpace(body) ? null : body
            };
        }
        catch (TaskCanceledException)
        {
            return new MinecraftCommandResultDto
            {
                Success = false,
                StatusCode = 504,
                RequestId = requestId,
                Message = $"Timeout lors de l'appel au bridge Minecraft (instance {targetInstance})."
            };
        }
        catch (Exception ex)
        {
            return new MinecraftCommandResultDto
            {
                Success = false,
                StatusCode = 502,
                RequestId = requestId,
                Message = $"Erreur bridge Minecraft (instance {targetInstance}): {ex.Message}"
            };
        }
    }

    public async Task<SyncTransferAndTpacceptResponseDto> SyncTransferAndTpacceptAsync(
        SyncTransferAndTpacceptRequestDto input,
        CancellationToken cancellationToken = default)
    {
        var leadDelayMs = input.LeadDelayMs ?? MinecraftSyncTransferBuilder.DefaultLeadDelayMs;
        var payload = MinecraftSyncTransferBuilder.BuildPayload(
            input.PartySlotId,
            leadDelayMs,
            input.RequestId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        _logger.LogInformation(
            "sync.requested requestId={RequestId} partySlotId={PartySlotId} leadDelayMs={LeadDelayMs} executeAtEpochMs={ExecuteAtEpochMs}",
            payload.RequestId,
            payload.PartySlotId,
            leadDelayMs,
            payload.ExecuteAtEpochMs);

        var client = _httpClientFactory.CreateClient(nameof(MinecraftBridgeService));
        client.Timeout = TimeSpan.FromMilliseconds(SyncTimeoutMs);

        var taskA = SendSyncWithRetryAsync(client, BridgeAUrl, "A", payload, cancellationToken);
        var taskB = SendSyncWithRetryAsync(client, BridgeBUrl, "B", payload, cancellationToken);
        await Task.WhenAll(taskA, taskB);

        var a = taskA.Result;
        var b = taskB.Result;
        var ok = IsSuccess(a) && IsSuccess(b);

        _logger.LogInformation(
            "sync.completed ok={Ok} requestId={RequestId} aStatus={AStatus} aLatencyMs={ALatencyMs} aError={AError} bStatus={BStatus} bLatencyMs={BLatencyMs} bError={BError}",
            ok,
            payload.RequestId,
            a.Status,
            a.LatencyMs,
            a.Error,
            b.Status,
            b.LatencyMs,
            b.Error);

        return new SyncTransferAndTpacceptResponseDto
        {
            Ok = ok,
            RequestId = payload.RequestId,
            ExecuteAtEpochMs = payload.ExecuteAtEpochMs,
            A = a,
            B = b
        };
    }

    private static bool IsSuccess(SyncBridgeTargetResultDto result)
    {
        if (result.Status is not >= 200 or >= 300 || !string.IsNullOrWhiteSpace(result.Error))
        {
            return false;
        }

        return IsAcceptedBody(result.Body);
    }

    private async Task<SyncBridgeTargetResultDto> SendSyncWithRetryAsync(
        HttpClient client,
        string baseUrl,
        string role,
        SyncBridgePayloadDto payload,
        CancellationToken cancellationToken)
    {
        var totalTimer = System.Diagnostics.Stopwatch.StartNew();

        SyncBridgeTargetResultDto? lastResult = null;

        for (var attempt = 0; attempt <= MaxSyncRetries; attempt++)
        {
            _logger.LogInformation(
                "sync.dispatch requestId={RequestId} role={Role} target={Target} endpoint={Endpoint} attempt={Attempt}",
                payload.RequestId,
                role,
                baseUrl,
                SyncEndpointPath,
                attempt + 1);

            lastResult = await SendSyncOnceAsync(client, baseUrl, role, payload, cancellationToken);
            var shouldRetry = attempt < MaxSyncRetries && ShouldRetry(lastResult);

            _logger.LogInformation(
                "sync.dispatch.result requestId={RequestId} role={Role} status={Status} error={Error} latencyMs={LatencyMs} accepted={Accepted} willRetry={WillRetry}",
                payload.RequestId,
                role,
                lastResult.Status,
                lastResult.Error,
                lastResult.LatencyMs,
                IsSuccess(lastResult),
                shouldRetry);

            if (!shouldRetry)
            {
                return CopyWithLatency(lastResult, totalTimer.ElapsedMilliseconds);
            }
        }

        return CopyWithLatency(
            lastResult ?? new SyncBridgeTargetResultDto { Error = "Unknown error." },
            totalTimer.ElapsedMilliseconds);
    }

    private static bool ShouldRetry(SyncBridgeTargetResultDto result)
    {
        if (!string.IsNullOrWhiteSpace(result.Error))
        {
            return true;
        }

        return result.Status is >= 500;
    }

    private async Task<SyncBridgeTargetResultDto> SendSyncOnceAsync(
        HttpClient client,
        string baseUrl,
        string role,
        SyncBridgePayloadDto payload,
        CancellationToken cancellationToken)
    {
        var timer = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            var requestJson = JsonSerializer.Serialize(payload, JsonOptions);
            using var content = new StringContent(requestJson, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}{SyncEndpointPath}")
            {
                Content = content
            };
            request.Headers.TryAddWithoutValidation("X-Bridge-Role", role);
            request.Headers.TryAddWithoutValidation("X-Request-Id", payload.RequestId);

            using var response = await client.SendAsync(request, cancellationToken);
            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

            return new SyncBridgeTargetResultDto
            {
                Status = (int)response.StatusCode,
                Body = ParseBody(responseText),
                Error = null,
                LatencyMs = timer.ElapsedMilliseconds
            };
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new SyncBridgeTargetResultDto
            {
                Error = "Request timeout.",
                LatencyMs = timer.ElapsedMilliseconds
            };
        }
        catch (HttpRequestException ex)
        {
            return new SyncBridgeTargetResultDto
            {
                Error = $"Network error: {ex.Message}",
                LatencyMs = timer.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            return new SyncBridgeTargetResultDto
            {
                Error = $"Unexpected error: {ex.Message}",
                LatencyMs = timer.ElapsedMilliseconds
            };
        }
    }

    private static object? ParseBody(string responseText)
    {
        if (string.IsNullOrWhiteSpace(responseText))
        {
            return null;
        }

        try
        {
            using var jsonDoc = JsonDocument.Parse(responseText);
            return jsonDoc.RootElement.Clone();
        }
        catch (JsonException)
        {
            return responseText;
        }
    }

    private static bool IsAcceptedBody(object? body)
    {
        if (body is not JsonElement jsonElement || jsonElement.ValueKind != JsonValueKind.Object)
        {
            return true;
        }

        if (TryGetBooleanProperty(jsonElement, "success", out var success))
        {
            return success;
        }

        if (TryGetBooleanProperty(jsonElement, "ok", out var ok))
        {
            return ok;
        }

        if (TryGetBooleanProperty(jsonElement, "accepted", out var accepted))
        {
            return accepted;
        }

        return true;
    }

    private static bool TryGetBooleanProperty(JsonElement json, string propertyName, out bool value)
    {
        foreach (var property in json.EnumerateObject())
        {
            if (!property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (property.Value.ValueKind == JsonValueKind.True)
            {
                value = true;
                return true;
            }

            if (property.Value.ValueKind == JsonValueKind.False)
            {
                value = false;
                return true;
            }
        }

        value = false;
        return false;
    }

    private static SyncBridgeTargetResultDto CopyWithLatency(SyncBridgeTargetResultDto result, long latencyMs)
    {
        return new SyncBridgeTargetResultDto
        {
            Status = result.Status,
            Body = result.Body,
            Error = result.Error,
            LatencyMs = latencyMs
        };
    }
}
