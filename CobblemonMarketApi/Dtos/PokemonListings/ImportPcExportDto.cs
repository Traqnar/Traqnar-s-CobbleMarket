using System.Text.Json;
using System.Text.Json.Serialization;

namespace CobblemonMarketApi.Dtos.PokemonListings;

public class ImportPcExportDto
{
    public DateTime? ExportedAt { get; set; }
    public string? PlayerName { get; set; }
    public List<ImportPcBoxDto> Boxes { get; set; } = new();
}

public class ImportPcBoxDto
{
    public int? BoxIndex { get; set; }
    public string? Name { get; set; }
    public List<ImportPcSlotDto> Slots { get; set; } = new();
}

public class ImportPcSlotDto
{
    public int? SlotIndex { get; set; }
    public ImportPcPokemonDto? Pokemon { get; set; }
}

public class ImportPcPokemonDto
{
    public string? Uuid { get; set; }
    public string? Species { get; set; }
    public string? SpeciesResourceIdentifier { get; set; }
    public string? SpeciesShowdownId { get; set; }
    public string? Form { get; set; }
    public string? FormId { get; set; }
    public string? FormShowdownId { get; set; }
    public List<string>? Aspects { get; set; }
    public string? Nickname { get; set; }
    public int? Level { get; set; }
    public string? Gender { get; set; }
    public string? Nature { get; set; }
    public string? NatureShowdownId { get; set; }
    public string? NatureResourceIdentifier { get; set; }
    public string? Ability { get; set; }
    public string? AbilityShowdownId { get; set; }
    public string? AbilityResourceIdentifier { get; set; }
    public bool? Shiny { get; set; }
    public int? HpIv { get; set; }
    public int? AttackIv { get; set; }
    public int? DefenseIv { get; set; }
    public int? SpecialAttackIv { get; set; }
    public int? SpecialDefenseIv { get; set; }
    public int? SpeedIv { get; set; }
    public ImportPcIvsDto? Ivs { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? Extra { get; set; }

    public JsonElement? TryGetExtraElement(params string[] keys)
    {
        if (Extra == null || keys.Length == 0)
        {
            return null;
        }

        foreach (var pair in Extra)
        {
            if (keys.Any(k => string.Equals(k, pair.Key, StringComparison.OrdinalIgnoreCase)))
            {
                return pair.Value;
            }
        }

        return null;
    }
}

public class ImportPcIvsDto
{
    public int? Hp { get; set; }
    public int? Attack { get; set; }
    public int? Defense { get; set; }
    public int? SpecialAttack { get; set; }
    public int? SpecialDefense { get; set; }
    public int? Speed { get; set; }

    [JsonPropertyName("sp_atk")]
    public int? SpAtk { get; set; }

    [JsonPropertyName("sp_def")]
    public int? SpDef { get; set; }

    [JsonPropertyName("spa")]
    public int? Spa { get; set; }

    [JsonPropertyName("spd")]
    public int? Spd { get; set; }

    [JsonPropertyName("spe")]
    public int? Spe { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? Extra { get; set; }

    public int? TryGetExtra(string key)
    {
        if (Extra == null)
        {
            return null;
        }

        var match = Extra.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase));
        if (string.IsNullOrEmpty(match.Key))
        {
            return null;
        }

        return match.Value.ValueKind switch
        {
            JsonValueKind.Number when match.Value.TryGetInt32(out var n) => n,
            JsonValueKind.String when int.TryParse(match.Value.GetString(), out var n) => n,
            _ => null
        };
    }
}
