namespace CobblemonMarketApi.Dtos.Minecraft;

public class MinecraftCommandResultDto
{
    public bool Success { get; set; }
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string? RawResponse { get; set; }
}
