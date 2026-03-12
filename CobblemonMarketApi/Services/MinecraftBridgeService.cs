using System.Text;
using System.Text.Json;
using CobblemonMarketApi.Dtos.Minecraft;
using CobblemonMarketApi.Options;
using Microsoft.Extensions.Options;

namespace CobblemonMarketApi.Services;

public class MinecraftBridgeService : IMinecraftBridgeService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly MinecraftBridgeOptions _options;

    public MinecraftBridgeService(IHttpClientFactory httpClientFactory, IOptions<MinecraftBridgeOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
    }

    public async Task<MinecraftCommandResultDto> ExportAllPcAsync(
        string requestedBy,
        CancellationToken cancellationToken = default)
    {
        var requestId = Guid.NewGuid().ToString("D");

        var baseUrl = string.IsNullOrWhiteSpace(_options.BaseUrl)
            ? "http://127.0.0.1:5149"
            : _options.BaseUrl;

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
                Message = response.IsSuccessStatusCode ? "Commande exportallpc envoyee." : "Le bridge Minecraft a retourne une erreur.",
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
                Message = "Timeout lors de l'appel au bridge Minecraft."
            };
        }
        catch (Exception ex)
        {
            return new MinecraftCommandResultDto
            {
                Success = false,
                StatusCode = 502,
                RequestId = requestId,
                Message = $"Erreur bridge Minecraft: {ex.Message}"
            };
        }
    }
}
