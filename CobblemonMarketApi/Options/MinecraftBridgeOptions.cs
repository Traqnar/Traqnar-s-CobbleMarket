namespace CobblemonMarketApi.Options;

public class MinecraftBridgeOptions
{
    public const string SectionName = "MinecraftBridge";

    public string BaseUrl { get; set; } = "http://127.0.0.1:5149";
    public int TimeoutSeconds { get; set; } = 15;
    public string ExportAllPcPath { get; set; } = "/api/bridge/export-all-pc";
}
