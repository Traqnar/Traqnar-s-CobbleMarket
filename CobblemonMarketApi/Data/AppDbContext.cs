using CobblemonMarketApi.Models;
using Microsoft.EntityFrameworkCore;

namespace CobblemonMarketApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ItemListing> ItemListings { get; set; }
    public DbSet<PokemonListing> PokemonListings { get; set; }
    public DbSet<Showcase> Showcases { get; set; }
    public DbSet<ShowcasePokemonListing> ShowcasePokemonListings { get; set; }
    public DbSet<ShowcaseItemListing> ShowcaseItemListings { get; set; }
    public DbSet<PokemonCatalog> PokemonCatalog { get; set; }
    public DbSet<PokemonFormCatalog> PokemonFormCatalog { get; set; }
    public DbSet<AbilityCatalog> AbilityCatalog { get; set; }
    public DbSet<PokemonAbility> PokemonAbilities { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<PokemonCatalog>(entity =>
        {
            entity.HasKey(x => x.PokedexNumber);

            entity.Property(x => x.EnglishName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.FrenchName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.DefaultImageUrl)
                .IsRequired()
                .HasMaxLength(500);

            entity.HasIndex(x => x.EnglishName);
            entity.HasIndex(x => x.FrenchName);
        });

        modelBuilder.Entity<AbilityCatalog>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.HasIndex(x => x.Name)
                .IsUnique();
        });

        modelBuilder.Entity<PokemonFormCatalog>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.FormKey)
                .IsRequired()
                .HasMaxLength(80);

            entity.Property(x => x.ApiName)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(x => x.DisplayName)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(x => x.DefaultImageUrl)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(x => x.ShinyImageUrl)
                .HasMaxLength(500);

            entity.HasOne(x => x.PokemonCatalog)
                .WithMany(x => x.PokemonForms)
                .HasForeignKey(x => x.PokedexNumber)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.PokedexNumber, x.FormKey })
                .IsUnique();

            entity.HasIndex(x => x.ApiName);
        });

        modelBuilder.Entity<PokemonAbility>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasOne(x => x.PokemonCatalog)
                .WithMany(x => x.PokemonAbilities)
                .HasForeignKey(x => x.PokedexNumber)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.AbilityCatalog)
                .WithMany(x => x.PokemonAbilities)
                .HasForeignKey(x => x.AbilityCatalogId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.PokedexNumber, x.AbilityCatalogId, x.IsHidden, x.Slot });
        });

        modelBuilder.Entity<PokemonListing>(entity =>
        {
            entity.Property(x => x.Uuid)
                .IsRequired()
                .HasMaxLength(64)
                .HasDefaultValue(string.Empty);

            entity.Property(x => x.Form)
                .IsRequired()
                .HasMaxLength(80)
                .HasDefaultValue(string.Empty);

            entity.HasIndex(x => x.Uuid)
                .IsUnique()
                .HasFilter("\"Uuid\" <> ''");
        });

        modelBuilder.Entity<Showcase>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Description)
                .HasMaxLength(500);
        });

        modelBuilder.Entity<ShowcasePokemonListing>(entity =>
        {
            entity.HasKey(x => new { x.ShowcaseId, x.PokemonListingId });

            entity.HasOne(x => x.Showcase)
                .WithMany(x => x.PokemonListingLinks)
                .HasForeignKey(x => x.ShowcaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.PokemonListing)
                .WithMany(x => x.ShowcaseLinks)
                .HasForeignKey(x => x.PokemonListingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.PokemonListingId);
        });

        modelBuilder.Entity<ShowcaseItemListing>(entity =>
        {
            entity.HasKey(x => new { x.ShowcaseId, x.ItemListingId });

            entity.HasOne(x => x.Showcase)
                .WithMany(x => x.ItemListingLinks)
                .HasForeignKey(x => x.ShowcaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ItemListing)
                .WithMany(x => x.ShowcaseLinks)
                .HasForeignKey(x => x.ItemListingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.ItemListingId);
        });
    }
}
