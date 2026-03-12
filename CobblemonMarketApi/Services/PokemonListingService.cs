using CobblemonMarketApi.Data;
using CobblemonMarketApi.Data.StaticData;
using CobblemonMarketApi.Dtos.PokemonListings;
using CobblemonMarketApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Globalization;
using System.Text;

namespace CobblemonMarketApi.Services;

public class PokemonListingService : IPokemonListingService
{
    private readonly AppDbContext _context;
    private readonly IImportNotificationService _notifications;

    public PokemonListingService(AppDbContext context, IImportNotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    public async Task<IEnumerable<PokemonListingDto>> GetAllAsync()
    {
        var listings = await _context.PokemonListings.ToListAsync();
        return listings.Select(MapToDto);
    }

    public async Task<IEnumerable<PokemonListingDto>> GetAllByShowcaseAsync(int showcaseId)
    {
        var listings = await _context.ShowcasePokemonListings
            .Where(x => x.ShowcaseId == showcaseId)
            .Select(x => x.PokemonListing)
            .ToListAsync();

        return listings.Select(MapToDto);
    }

    public async Task<PokemonListingDto?> GetByIdAsync(int showcaseId, int id)
    {
        var listing = await _context.ShowcasePokemonListings
            .Where(x => x.ShowcaseId == showcaseId && x.PokemonListingId == id)
            .Select(x => x.PokemonListing)
            .FirstOrDefaultAsync();

        return listing == null ? null : MapToDto(listing);
    }

    public async Task<PokemonListingDto?> CreateAsync(int showcaseId, CreatePokemonListingDto dto)
    {
        var showcaseExists = await _context.Showcases.AnyAsync(x => x.Id == showcaseId);

        if (!showcaseExists)
        {
            return null;
        }

        var listing = new PokemonListing
        {
            Title = dto.Title,
            Price = dto.Price,
            Description = dto.Description,
            Form = NormalizeForm(dto.Form),
            PokedexNumber = dto.PokedexNumber,
            PokemonName = dto.PokemonName,
            Level = dto.Level,
            Nature = dto.Nature,
            Ability = dto.Ability,
            IsHiddenAbility = dto.IsHiddenAbility,
            Gender = dto.Gender,
            IsShiny = dto.IsShiny,
            DefaultImageUrl = await ResolvePokemonImageUrlAsync(dto.PokedexNumber, NormalizeForm(dto.Form), dto.IsShiny),
            CustomImageUrl = dto.CustomImageUrl,
            HpIv = dto.HpIv,
            AttackIv = dto.AttackIv,
            DefenseIv = dto.DefenseIv,
            SpecialAttackIv = dto.SpecialAttackIv,
            SpecialDefenseIv = dto.SpecialDefenseIv,
            SpeedIv = dto.SpeedIv,
            TotalIvPercentage = CalculateTotalIvPercentage(
                dto.HpIv,
                dto.AttackIv,
                dto.DefenseIv,
                dto.SpecialAttackIv,
                dto.SpecialDefenseIv,
                dto.SpeedIv)
        };

        _context.PokemonListings.Add(listing);
        await _context.SaveChangesAsync();

        _context.ShowcasePokemonListings.Add(new ShowcasePokemonListing
        {
            ShowcaseId = showcaseId,
            PokemonListingId = listing.Id
        });

        await _context.SaveChangesAsync();
        return MapToDto(listing);
    }

    public async Task<ImportPcPokemonListingsResultDto> ImportFromPcExportAsync(ImportPcExportDto dto)
    {
        var skippedCount = 0;
        var duplicateUuidCount = 0;
        var unknownSpeciesCount = 0;

        var pokemonToImport = dto.Boxes
            .SelectMany(box => box.Slots.Select(slot => new ImportPokemonContext
            {
                Pokemon = slot.Pokemon,
                BoxIndex = box.BoxIndex,
                BoxName = box.Name,
                SlotIndex = slot.SlotIndex
            }))
            .Where(x => x.Pokemon != null)
            .ToList();

        if (pokemonToImport.Count == 0)
        {
            var emptyResult = new ImportPcPokemonListingsResultDto
            {
                ImportedCount = 0,
                SkippedCount = 0,
                DuplicateUuidCount = 0,
                UnknownSpeciesCount = 0
            };

            PublishImportNotification(emptyResult);
            return emptyResult;
        }

        var allCatalog = await _context.PokemonCatalog
            .AsNoTracking()
            .ToListAsync();

        var catalogByName = new Dictionary<string, PokemonCatalog>(StringComparer.OrdinalIgnoreCase);
        var catalogByCanonicalName = new Dictionary<string, PokemonCatalog>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in allCatalog)
        {
            if (!string.IsNullOrWhiteSpace(entry.EnglishName))
            {
                catalogByName.TryAdd(entry.EnglishName.Trim(), entry);
                catalogByCanonicalName.TryAdd(CanonicalizeSpeciesKey(entry.EnglishName), entry);
            }

            if (!string.IsNullOrWhiteSpace(entry.FrenchName))
            {
                catalogByName.TryAdd(entry.FrenchName.Trim(), entry);
                catalogByCanonicalName.TryAdd(CanonicalizeSpeciesKey(entry.FrenchName), entry);
            }
        }

        var newListings = new List<PokemonListing>();
        var importUuids = pokemonToImport
            .Select(x => NormalizeUuid(x.Pokemon!.Uuid))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existingUuids = importUuids.Count == 0
            ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            : (await _context.PokemonListings
                .AsNoTracking()
                .Where(x => importUuids.Contains(x.Uuid))
                .Select(x => x.Uuid)
                .ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var seenUuidsInPayload = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var abilityLookupCache = new Dictionary<int, List<AbilityLookupEntry>>();

        foreach (var importItem in pokemonToImport)
        {
            var pokemon = importItem.Pokemon!;

            var catalogEntry = ResolveCatalogEntryFromImport(pokemon, catalogByName, catalogByCanonicalName);
            if (catalogEntry == null)
            {
                skippedCount++;
                unknownSpeciesCount++;
                continue;
            }

            var normalizedUuid = NormalizeUuid(pokemon.Uuid);
            if (!string.IsNullOrWhiteSpace(normalizedUuid))
            {
                var alreadyExists = existingUuids.Contains(normalizedUuid);
                var duplicatedInPayload = !seenUuidsInPayload.Add(normalizedUuid);

                if (alreadyExists || duplicatedInPayload)
                {
                    skippedCount++;
                    duplicateUuidCount++;
                    continue;
                }
            }

            var level = Math.Clamp(pokemon.Level ?? 1, 1, 100);
            var isShiny = pokemon.Shiny ?? false;
            var englishName = catalogEntry.EnglishName;
            var form = NormalizeForm(pokemon.Form, pokemon.FormId, pokemon.Aspects);
            var title = BuildImportTitle(englishName, form, NormalizeNicknameFromImport(pokemon));
            var hpIv = ResolveHpIv(pokemon);
            var attackIv = ResolveAttackIv(pokemon);
            var defenseIv = ResolveDefenseIv(pokemon);
            var specialAttackIv = ResolveSpecialAttackIv(pokemon);
            var specialDefenseIv = ResolveSpecialDefenseIv(pokemon);
            var speedIv = ResolveSpeedIv(pokemon);
            var ability = NormalizeAbilityFromImport(pokemon);
            var isHiddenAbility = await ResolveIsHiddenAbilityAsync(catalogEntry.PokedexNumber, ability, abilityLookupCache);

            var listing = new PokemonListing
            {
                Uuid = normalizedUuid,
                Title = title,
                Price = 0,
                Description = BuildImportDescription(importItem.BoxIndex, importItem.BoxName, importItem.SlotIndex),
                Form = form,
                PokedexNumber = catalogEntry.PokedexNumber,
                PokemonName = englishName,
                Level = level,
                Nature = NormalizeNatureFromImport(pokemon),
                Ability = ability,
                IsHiddenAbility = isHiddenAbility,
                Gender = NormalizeGender(pokemon.Gender),
                IsShiny = isShiny,
                DefaultImageUrl = await ResolvePokemonImageUrlAsync(catalogEntry.PokedexNumber, form, isShiny),
                CustomImageUrl = null,
                HpIv = hpIv,
                AttackIv = attackIv,
                DefenseIv = defenseIv,
                SpecialAttackIv = specialAttackIv,
                SpecialDefenseIv = specialDefenseIv,
                SpeedIv = speedIv,
                TotalIvPercentage = CalculateTotalIvPercentage(
                    hpIv,
                    attackIv,
                    defenseIv,
                    specialAttackIv,
                    specialDefenseIv,
                    speedIv)
            };

            newListings.Add(listing);
        }

        if (newListings.Count == 0)
        {
            var noImportResult = new ImportPcPokemonListingsResultDto
            {
                ImportedCount = 0,
                SkippedCount = skippedCount,
                DuplicateUuidCount = duplicateUuidCount,
                UnknownSpeciesCount = unknownSpeciesCount
            };

            PublishImportNotification(noImportResult);
            return noImportResult;
        }

        _context.PokemonListings.AddRange(newListings);
        await _context.SaveChangesAsync();

        var result = new ImportPcPokemonListingsResultDto
        {
            ImportedCount = newListings.Count,
            SkippedCount = skippedCount,
            DuplicateUuidCount = duplicateUuidCount,
            UnknownSpeciesCount = unknownSpeciesCount
        };

        PublishImportNotification(result);
        return result;
    }

    public async Task<PokemonListingDto?> AttachExistingAsync(int showcaseId, int listingId)
    {
        var showcaseExists = await _context.Showcases.AnyAsync(x => x.Id == showcaseId);
        var listing = await _context.PokemonListings.FindAsync(listingId);

        if (!showcaseExists || listing == null)
        {
            return null;
        }

        var alreadyLinked = await _context.ShowcasePokemonListings
            .AnyAsync(x => x.ShowcaseId == showcaseId && x.PokemonListingId == listingId);

        if (!alreadyLinked)
        {
            _context.ShowcasePokemonListings.Add(new ShowcasePokemonListing
            {
                ShowcaseId = showcaseId,
                PokemonListingId = listingId
            });

            await _context.SaveChangesAsync();
        }

        return MapToDto(listing);
    }

    public async Task<bool> UpdateAsync(int showcaseId, int id, UpdatePokemonListingDto dto)
    {
        var isLinked = await _context.ShowcasePokemonListings
            .AnyAsync(x => x.ShowcaseId == showcaseId && x.PokemonListingId == id);

        if (!isLinked)
        {
            return false;
        }

        var listing = await _context.PokemonListings.FindAsync(id);

        if (listing == null)
        {
            return false;
        }

        listing.Title = dto.Title;
        listing.Price = dto.Price;
        listing.Description = dto.Description;
        listing.Form = NormalizeForm(dto.Form);
        listing.PokedexNumber = dto.PokedexNumber;
        listing.PokemonName = dto.PokemonName;
        listing.Level = dto.Level;
        listing.Nature = dto.Nature;
        listing.Ability = dto.Ability;
        listing.IsHiddenAbility = dto.IsHiddenAbility;
        listing.Gender = dto.Gender;
        listing.IsShiny = dto.IsShiny;
        listing.DefaultImageUrl = await ResolvePokemonImageUrlAsync(dto.PokedexNumber, listing.Form, dto.IsShiny);
        listing.CustomImageUrl = dto.CustomImageUrl;
        listing.HpIv = dto.HpIv;
        listing.AttackIv = dto.AttackIv;
        listing.DefenseIv = dto.DefenseIv;
        listing.SpecialAttackIv = dto.SpecialAttackIv;
        listing.SpecialDefenseIv = dto.SpecialDefenseIv;
        listing.SpeedIv = dto.SpeedIv;
        listing.TotalIvPercentage = CalculateTotalIvPercentage(
            dto.HpIv,
            dto.AttackIv,
            dto.DefenseIv,
            dto.SpecialAttackIv,
            dto.SpecialDefenseIv,
            dto.SpeedIv
        );

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int showcaseId, int id)
    {
        var link = await _context.ShowcasePokemonListings
            .FirstOrDefaultAsync(x => x.ShowcaseId == showcaseId && x.PokemonListingId == id);

        if (link == null)
        {
            return false;
        }

        _context.ShowcasePokemonListings.Remove(link);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteGlobalAsync(int id)
    {
        var listing = await _context.PokemonListings.FindAsync(id);
        if (listing == null)
        {
            return false;
        }

        _context.PokemonListings.Remove(listing);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PokemonListingDto MapToDto(PokemonListing listing)
    {
        return new PokemonListingDto
        {
            Id = listing.Id,
            Uuid = listing.Uuid,
            Form = listing.Form,
            Title = listing.Title,
            Price = listing.Price,
            Description = listing.Description,
            PokedexNumber = listing.PokedexNumber,
            PokemonName = listing.PokemonName,
            Level = listing.Level,
            Nature = listing.Nature,
            Ability = listing.Ability,
            IsHiddenAbility = listing.IsHiddenAbility,
            Gender = listing.Gender,
            IsShiny = listing.IsShiny,
            DefaultImageUrl = listing.DefaultImageUrl,
            CustomImageUrl = listing.CustomImageUrl,
            HpIv = listing.HpIv,
            AttackIv = listing.AttackIv,
            DefenseIv = listing.DefenseIv,
            SpecialAttackIv = listing.SpecialAttackIv,
            SpecialDefenseIv = listing.SpecialDefenseIv,
            SpeedIv = listing.SpeedIv,
            TotalIvPercentage = listing.TotalIvPercentage
        };
    }

    private static double CalculateTotalIvPercentage(
        int hpIv,
        int attackIv,
        int defenseIv,
        int specialAttackIv,
        int specialDefenseIv,
        int speedIv)
    {
        var total = hpIv + attackIv + defenseIv + specialAttackIv + specialDefenseIv + speedIv;
        return Math.Round((total / 186.0) * 100, 2);
    }

    private async Task<string> ResolvePokemonImageUrlAsync(int pokedexNumber, string form, bool isShiny)
    {
        var normalizedForm = NormalizeForm(form);

        if (!string.IsNullOrWhiteSpace(normalizedForm))
        {
            var formEntries = await _context.PokemonFormCatalog
                .AsNoTracking()
                .Where(x => x.PokedexNumber == pokedexNumber)
                .ToListAsync();

            var formEntry = formEntries.FirstOrDefault(x => x.FormKey == normalizedForm)
                            ?? formEntries.FirstOrDefault(x => AreEquivalentFormKeys(x.FormKey, normalizedForm));

            if (formEntry != null)
            {
                if (isShiny && !string.IsNullOrWhiteSpace(formEntry.ShinyImageUrl))
                {
                    return formEntry.ShinyImageUrl;
                }

                return formEntry.DefaultImageUrl;
            }
        }

        return BuildDefaultSpeciesImageUrl(pokedexNumber, isShiny);
    }

    private static string BuildDefaultSpeciesImageUrl(int pokedexNumber, bool isShiny)
    {
        var baseUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
        return isShiny
            ? $"{baseUrl}/shiny/{pokedexNumber}.png"
            : $"{baseUrl}/{pokedexNumber}.png";
    }

    private static string NormalizeSpecies(string? species)
    {
        if (string.IsNullOrWhiteSpace(species))
        {
            return string.Empty;
        }

        var cleaned = species.Trim().Replace('_', ' ').Replace('-', ' ');
        return cleaned;
    }

    private static PokemonCatalog? ResolveCatalogEntryFromImport(
        ImportPcPokemonDto pokemon,
        Dictionary<string, PokemonCatalog> byName,
        Dictionary<string, PokemonCatalog> byCanonicalName)
    {
        var candidates = new[]
        {
            pokemon.SpeciesShowdownId,
            ExtractSpeciesFromResourceIdentifier(pokemon.SpeciesResourceIdentifier),
            pokemon.Species,
            TryReadStringFromExtra(pokemon, "speciesShowdownId"),
            TryReadStringFromExtra(pokemon, "species_showdown_id"),
            ExtractSpeciesFromResourceIdentifier(TryReadStringFromExtra(pokemon, "speciesResourceIdentifier")),
            ExtractSpeciesFromResourceIdentifier(TryReadStringFromExtra(pokemon, "species_resource_identifier")),
            TryReadStringFromExtra(pokemon, "species")
        };

        foreach (var raw in candidates)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                continue;
            }

            var normalized = NormalizeSpecies(raw);
            if (byName.TryGetValue(normalized, out var byExact))
            {
                return byExact;
            }

            var canonical = CanonicalizeSpeciesKey(raw);
            if (!string.IsNullOrWhiteSpace(canonical) && byCanonicalName.TryGetValue(canonical, out var byCanonical))
            {
                return byCanonical;
            }
        }

        return null;
    }

    private static string ExtractSpeciesFromResourceIdentifier(string? resourceIdentifier)
    {
        if (string.IsNullOrWhiteSpace(resourceIdentifier))
        {
            return string.Empty;
        }

        var trimmed = resourceIdentifier.Trim();
        var index = trimmed.IndexOf(':');
        return index >= 0 && index < trimmed.Length - 1
            ? trimmed[(index + 1)..]
            : trimmed;
    }

    private static string CanonicalizeSpeciesKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var lowered = value.Trim().ToLowerInvariant();
        var decomposed = lowered.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);

        foreach (var ch in decomposed)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(ch);
            }
        }

        return sb.ToString();
    }

    private static string NormalizeNature(string? nature)
    {
        if (string.IsNullOrWhiteSpace(nature))
        {
            return "Unknown";
        }

        var cleaned = nature.Trim();

        if (cleaned.Contains('@'))
        {
            return "Unknown";
        }

        var exactMatch = NatureList.All.FirstOrDefault(x => x.Equals(cleaned, StringComparison.OrdinalIgnoreCase));
        return exactMatch ?? "Unknown";
    }

    private static string NormalizeNatureFromImport(ImportPcPokemonDto pokemon)
    {
        var raw = FirstNonEmpty(
            pokemon.NatureShowdownId,
            pokemon.NatureResourceIdentifier,
            pokemon.Nature,
            TryReadStringFromExtra(pokemon, "natureShowdownId"),
            TryReadStringFromExtra(pokemon, "nature_showdown_id"),
            TryReadStringFromExtra(pokemon, "natureResourceIdentifier"),
            TryReadStringFromExtra(pokemon, "nature_resource_identifier"),
            TryReadStringFromExtra(pokemon, "nature"),
            TryReadStringFromExtra(pokemon, "nature_id"),
            TryReadNatureFromObject(pokemon));

        if (string.IsNullOrWhiteSpace(raw))
        {
            return "Unknown";
        }

        var extracted = TryExtractNatureName(raw);
        if (!string.IsNullOrWhiteSpace(extracted))
        {
            return extracted;
        }

        var normalized = raw.Trim().ToLowerInvariant();

        if (normalized.StartsWith("cobblemon.nature."))
        {
            normalized = normalized["cobblemon.nature.".Length..];
        }

        if (normalized.StartsWith("cobblemon:nature."))
        {
            normalized = normalized["cobblemon:nature.".Length..];
        }

        if (normalized.StartsWith("cobblemon:"))
        {
            normalized = normalized["cobblemon:".Length..];
        }

        // Example "com.cobblemon....Nature@abcd": try one last extraction before failing.
        if (normalized.Contains('@') || normalized.Contains("nature@"))
        {
            var fromGarbage = TryExtractNatureName(normalized);
            return fromGarbage ?? "Unknown";
        }

        normalized = normalized.Replace('_', ' ').Replace('-', ' ').Replace('.', ' ').Trim();
        normalized = Regex.Replace(normalized, @"\s+", " ");

        var exact = NatureList.All.FirstOrDefault(x => x.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        if (exact != null)
        {
            return exact;
        }

        var title = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(normalized);
        exact = NatureList.All.FirstOrDefault(x => x.Equals(title, StringComparison.OrdinalIgnoreCase));
        return exact ?? "Unknown";
    }

    private static string NormalizeGender(string? gender)
    {
        if (string.IsNullOrWhiteSpace(gender))
        {
            return "UNKNOWN";
        }

        var value = gender.Trim().ToUpperInvariant();

        return value switch
        {
            "MALE" => "MALE",
            "FEMALE" => "FEMALE",
            "GENDERLESS" => "GENDERLESS",
            _ => "UNKNOWN"
        };
    }

    private static string BuildImportDescription(int? boxIndex, string? boxName, int? slotIndex)
    {
        var displayBoxNumber = Math.Max((boxIndex ?? 0) + 1, 1);
        var cleanedBoxName = NormalizeBoxName(boxName);
        var boxPart = string.IsNullOrWhiteSpace(cleanedBoxName)
            ? $"Imported from PC box {displayBoxNumber}"
            : $"Imported from PC box {displayBoxNumber} ({cleanedBoxName})";

        var displaySlotNumber = Math.Max((slotIndex ?? 0) + 1, 1);
        return $"{boxPart} - slot {displaySlotNumber}";
    }

    private static string BuildImportTitle(string englishName, string form, string? nickname)
    {
        if (!string.IsNullOrWhiteSpace(nickname))
        {
            return nickname;
        }

        var formPart = string.IsNullOrWhiteSpace(form)
            ? string.Empty
            : $" ({CultureInfo.InvariantCulture.TextInfo.ToTitleCase(form.Replace("-", " "))})";

        return $"{englishName}{formPart} - PC Export";
    }

    private void PublishImportNotification(ImportPcPokemonListingsResultDto result)
    {
        var payload = JsonSerializer.Serialize(new
        {
            type = "import-pc",
            importedAtUtc = DateTime.UtcNow,
            result.ImportedCount,
            result.SkippedCount,
            result.DuplicateUuidCount,
            result.UnknownSpeciesCount
        });

        _notifications.Publish(payload);
    }

    private static string NormalizeUuid(string? uuid)
    {
        if (string.IsNullOrWhiteSpace(uuid))
        {
            return string.Empty;
        }

        var raw = uuid.Trim();
        return Guid.TryParse(raw, out var parsed) ? parsed.ToString("D") : raw;
    }

    private static string NormalizeForm(string? form, string? formId = null, IEnumerable<string>? aspects = null)
    {
        if (!string.IsNullOrWhiteSpace(form))
        {
            return CanonicalizeFormKey(form);
        }

        if (!string.IsNullOrWhiteSpace(formId))
        {
            return CanonicalizeFormKey(formId);
        }

        if (aspects != null)
        {
            var formAspect = aspects
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .FirstOrDefault(IsKnownRegionalForm);

            if (!string.IsNullOrWhiteSpace(formAspect))
            {
                return CanonicalizeFormKey(formAspect);
            }
        }

        return string.Empty;
    }

    private static bool IsKnownRegionalForm(string value)
    {
        var key = CanonicalizeFormKey(value);
        return key is "hisui" or "alola" or "galar" or "paldea";
    }

    private static string CanonicalizeFormKey(string rawForm)
    {
        if (string.IsNullOrWhiteSpace(rawForm))
        {
            return string.Empty;
        }

        var lowered = rawForm.Trim().ToLowerInvariant();
        lowered = lowered.Replace('_', '-').Replace(' ', '-');
        lowered = Regex.Replace(lowered, "-{2,}", "-").Trim('-');

        var canonical = lowered switch
        {
            "hisuian" => "hisui",
            "alolan" => "alola",
            "galarian" => "galar",
            "paldean" => "paldea",
            "default" => string.Empty,
            "normal" => string.Empty,
            "base" => string.Empty,
            _ => lowered
        };

        return canonical.Length > 80 ? canonical[..80] : canonical;
    }

    private static bool AreEquivalentFormKeys(string left, string right)
    {
        return CanonicalizeFormKey(left) == CanonicalizeFormKey(right);
    }

    private static int ResolveHpIv(ImportPcPokemonDto pokemon)
        => NormalizeIv(
            pokemon.HpIv
            ?? pokemon.Ivs?.Hp
            ?? pokemon.Ivs?.TryGetExtra("hp")
            ?? TryResolveIvFromPayload(pokemon, "hp"));

    private static int ResolveAttackIv(ImportPcPokemonDto pokemon)
        => NormalizeIv(
            pokemon.AttackIv
            ?? pokemon.Ivs?.Attack
            ?? pokemon.Ivs?.TryGetExtra("attack")
            ?? TryResolveIvFromPayload(pokemon, "attack"));

    private static int ResolveDefenseIv(ImportPcPokemonDto pokemon)
        => NormalizeIv(
            pokemon.DefenseIv
            ?? pokemon.Ivs?.Defense
            ?? pokemon.Ivs?.TryGetExtra("defense")
            ?? TryResolveIvFromPayload(pokemon, "defense"));

    private static int ResolveSpecialAttackIv(ImportPcPokemonDto pokemon)
        => NormalizeIv(
            pokemon.SpecialAttackIv
            ?? pokemon.Ivs?.SpecialAttack
            ?? pokemon.Ivs?.SpAtk
            ?? pokemon.Ivs?.Spa
            ?? pokemon.Ivs?.TryGetExtra("special_attack")
            ?? pokemon.Ivs?.TryGetExtra("spatk")
            ?? pokemon.Ivs?.TryGetExtra("spa")
            ?? TryResolveIvFromPayload(pokemon, "special-attack"));

    private static int ResolveSpecialDefenseIv(ImportPcPokemonDto pokemon)
        => NormalizeIv(
            pokemon.SpecialDefenseIv
            ?? pokemon.Ivs?.SpecialDefense
            ?? pokemon.Ivs?.SpDef
            ?? pokemon.Ivs?.Spd
            ?? pokemon.Ivs?.TryGetExtra("special_defense")
            ?? pokemon.Ivs?.TryGetExtra("spdef")
            ?? pokemon.Ivs?.TryGetExtra("spd")
            ?? TryResolveIvFromPayload(pokemon, "special-defense"));

    private static int ResolveSpeedIv(ImportPcPokemonDto pokemon)
        => NormalizeIv(
            pokemon.SpeedIv
            ?? pokemon.Ivs?.Speed
            ?? pokemon.Ivs?.Spe
            ?? pokemon.Ivs?.TryGetExtra("speed")
            ?? pokemon.Ivs?.TryGetExtra("spe")
            ?? TryResolveIvFromPayload(pokemon, "speed"));

    private static int NormalizeIv(int? iv)
    {
        if (!iv.HasValue)
        {
            return 0;
        }

        return Math.Clamp(iv.Value, 0, 31);
    }

    private static int? TryResolveIvFromPayload(ImportPcPokemonDto pokemon, string stat)
    {
        var statAliases = GetStatAliases(stat);
        var directKeys = statAliases.SelectMany(x => new[]
        {
            $"{x}iv",
            $"iv{x}",
            $"{x}_iv",
            $"iv_{x}"
        }).ToArray();

        var direct = TryReadIntFromExtra(pokemon, directKeys);
        if (direct.HasValue)
        {
            return direct;
        }

        var ivContainers = new[] { "ivs", "iv", "individualvalues", "individual_values", "individual-values" };
        foreach (var containerKey in ivContainers)
        {
            var ivElement = pokemon.TryGetExtraElement(containerKey);
            var fromContainer = TryReadStatFromContainer(ivElement, statAliases);
            if (fromContainer.HasValue)
            {
                return fromContainer;
            }
        }

        var statsContainer = pokemon.TryGetExtraElement("stats");
        var fromStats = TryReadStatFromStatsContainer(statsContainer, statAliases);
        if (fromStats.HasValue)
        {
            return fromStats;
        }

        return null;
    }

    private static int? TryReadIntFromExtra(ImportPcPokemonDto pokemon, params string[] keys)
    {
        var element = pokemon.TryGetExtraElement(keys);
        return element.HasValue ? TryParseJsonInt(element.Value) : null;
    }

    private static int? TryReadStatFromStatsContainer(JsonElement? statsElement, string[] statAliases)
    {
        if (!statsElement.HasValue || statsElement.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var stats = statsElement.Value;
        var ivsNode = TryGetPropertyCaseInsensitive(stats, "ivs")
                      ?? TryGetPropertyCaseInsensitive(stats, "iv")
                      ?? TryGetPropertyCaseInsensitive(stats, "individualValues")
                      ?? TryGetPropertyCaseInsensitive(stats, "individual_values");

        var fromNested = TryReadStatFromContainer(ivsNode, statAliases);
        if (fromNested.HasValue)
        {
            return fromNested;
        }

        return TryReadStatFromContainer(stats, statAliases);
    }

    private static int? TryReadStatFromContainer(JsonElement? containerElement, string[] statAliases)
    {
        if (!containerElement.HasValue || containerElement.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var container = containerElement.Value;
        foreach (var alias in statAliases)
        {
            var keys = new[]
            {
                alias,
                alias.Replace("-", "_"),
                alias.Replace("-", string.Empty)
            };

            foreach (var key in keys)
            {
                var prop = TryGetPropertyCaseInsensitive(container, key);
                if (prop.HasValue)
                {
                    var parsed = TryParseJsonInt(prop.Value);
                    if (parsed.HasValue)
                    {
                        return parsed;
                    }
                }
            }
        }

        return null;
    }

    private static JsonElement? TryGetPropertyCaseInsensitive(JsonElement obj, string propertyName)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            if (string.Equals(prop.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                return prop.Value;
            }
        }

        return null;
    }

    private static int? TryParseJsonInt(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Number when element.TryGetInt32(out var n) => n,
            JsonValueKind.String when int.TryParse(element.GetString(), out var n) => n,
            _ => null
        };
    }

    private static string[] GetStatAliases(string stat)
    {
        var normalized = stat.Trim().ToLowerInvariant();
        return normalized switch
        {
            "hp" => new[] { "hp" },
            "attack" => new[] { "attack", "atk" },
            "defense" => new[] { "defense", "def" },
            "special-attack" => new[] { "special-attack", "special_attack", "spatk", "spa" },
            "special-defense" => new[] { "special-defense", "special_defense", "spdef", "spd" },
            "speed" => new[] { "speed", "spe" },
            _ => new[] { normalized }
        };
    }

    private static string NormalizeAbilityFromImport(ImportPcPokemonDto pokemon)
    {
        var raw = FirstNonEmpty(
            pokemon.Ability,
            pokemon.AbilityShowdownId,
            pokemon.AbilityResourceIdentifier,
            TryReadStringFromExtra(pokemon, "ability"),
            TryReadStringFromExtra(pokemon, "abilityShowdownId"),
            TryReadStringFromExtra(pokemon, "abilityResourceIdentifier"),
            TryReadStringFromExtra(pokemon, "ability_id"));

        if (string.IsNullOrWhiteSpace(raw))
        {
            return "Unknown";
        }

        var cleaned = raw.Trim().ToLowerInvariant();

        if (cleaned.StartsWith("cobblemon.ability."))
        {
            cleaned = cleaned["cobblemon.ability.".Length..];
        }

        if (cleaned.StartsWith("cobblemon:"))
        {
            cleaned = cleaned["cobblemon:".Length..];
        }

        cleaned = cleaned.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
        cleaned = Regex.Replace(cleaned, @"\s+", " ");

        if (string.IsNullOrWhiteSpace(cleaned))
        {
            return "Unknown";
        }

        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(cleaned);
    }

    private async Task<bool> ResolveIsHiddenAbilityAsync(
        int pokedexNumber,
        string abilityName,
        Dictionary<int, List<AbilityLookupEntry>> cache)
    {
        if (string.IsNullOrWhiteSpace(abilityName) || abilityName.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!cache.TryGetValue(pokedexNumber, out var entries))
        {
            entries = await _context.PokemonAbilities
                .AsNoTracking()
                .Include(x => x.AbilityCatalog)
                .Where(x => x.PokedexNumber == pokedexNumber)
                .Select(x => new AbilityLookupEntry
                {
                    AbilityName = x.AbilityCatalog.Name,
                    IsHidden = x.IsHidden
                })
                .ToListAsync();

            cache[pokedexNumber] = entries;
        }

        var normalizedIncoming = NormalizeAbilityForComparison(abilityName);
        var match = entries.FirstOrDefault(x => NormalizeAbilityForComparison(x.AbilityName) == normalizedIncoming);
        return match?.IsHidden ?? false;
    }

    private static string NormalizeAbilityForComparison(string abilityName)
    {
        if (string.IsNullOrWhiteSpace(abilityName))
        {
            return string.Empty;
        }

        var lowered = abilityName.Trim().ToLowerInvariant();
        var chars = lowered.Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private static string? TryReadStringFromExtra(ImportPcPokemonDto pokemon, params string[] keys)
    {
        var element = pokemon.TryGetExtraElement(keys);
        if (!element.HasValue)
        {
            return null;
        }

        return element.Value.ValueKind switch
        {
            JsonValueKind.String => element.Value.GetString(),
            JsonValueKind.Number => element.Value.GetRawText(),
            JsonValueKind.Object => TryReadStringFromJsonObject(
                element.Value,
                "name",
                "id",
                "value",
                "showdownId",
                "showdown_id",
                "resourceIdentifier",
                "resource_identifier"),
            _ => null
        };
    }

    private static string? NormalizeNicknameFromImport(ImportPcPokemonDto pokemon)
    {
        var raw = FirstNonEmpty(
            pokemon.Nickname,
            TryReadStringFromExtra(pokemon, "nickname"),
            TryReadStringFromExtra(pokemon, "nickName"),
            TryReadStringFromExtra(pokemon, "name"));

        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var value = raw.Trim();

        if (value.StartsWith("literal{", StringComparison.OrdinalIgnoreCase) && value.EndsWith("}"))
        {
            value = value[8..^1].Trim();
        }

        if (value.StartsWith("\"") && value.EndsWith("\"") && value.Length >= 2)
        {
            value = value[1..^1];
        }

        value = Regex.Replace(value, @"\s+", " ").Trim();

        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string? NormalizeBoxName(string? rawBoxName)
    {
        if (string.IsNullOrWhiteSpace(rawBoxName))
        {
            return null;
        }

        var value = rawBoxName.Trim();

        if (value.StartsWith("literal{", StringComparison.OrdinalIgnoreCase) && value.EndsWith("}"))
        {
            value = value[8..^1].Trim();
        }

        value = Regex.Replace(value, @"\s+", " ").Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string? TryReadNatureFromObject(ImportPcPokemonDto pokemon)
    {
        var element = pokemon.TryGetExtraElement("nature");
        if (!element.HasValue || element.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return TryReadStringFromJsonObject(
            element.Value,
            "showdownId",
            "showdown_id",
            "name",
            "id",
            "resourceIdentifier",
            "resource_identifier",
            "value");
    }

    private static string? TryReadStringFromJsonObject(JsonElement obj, params string[] keys)
    {
        foreach (var key in keys)
        {
            var prop = TryGetPropertyCaseInsensitive(obj, key);
            if (!prop.HasValue)
            {
                continue;
            }

            var value = prop.Value.ValueKind switch
            {
                JsonValueKind.String => prop.Value.GetString(),
                JsonValueKind.Number => prop.Value.GetRawText(),
                _ => null
            };

            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private static string? TryExtractNatureName(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var lowered = raw.ToLowerInvariant();
        var match = NatureList.All.FirstOrDefault(n => lowered.Contains(n.ToLowerInvariant()));
        return match;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private sealed class ImportPokemonContext
    {
        public ImportPcPokemonDto? Pokemon { get; set; }
        public int? BoxIndex { get; set; }
        public string? BoxName { get; set; }
        public int? SlotIndex { get; set; }
    }

    private sealed class AbilityLookupEntry
    {
        public string AbilityName { get; set; } = string.Empty;
        public bool IsHidden { get; set; }
    }
}
