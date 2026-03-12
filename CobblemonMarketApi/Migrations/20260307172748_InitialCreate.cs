using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItemListings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ImageUrl = table.Column<string>(type: "TEXT", nullable: false),
                    StockQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Price = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemListings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PokemonListings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PokedexNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    PokemonName = table.Column<string>(type: "TEXT", nullable: false),
                    Level = table.Column<int>(type: "INTEGER", nullable: false),
                    Nature = table.Column<string>(type: "TEXT", nullable: false),
                    Ability = table.Column<string>(type: "TEXT", nullable: false),
                    Gender = table.Column<string>(type: "TEXT", nullable: false),
                    IsShiny = table.Column<bool>(type: "INTEGER", nullable: false),
                    DefaultImageUrl = table.Column<string>(type: "TEXT", nullable: false),
                    CustomImageUrl = table.Column<string>(type: "TEXT", nullable: true),
                    HpIv = table.Column<int>(type: "INTEGER", nullable: false),
                    AttackIv = table.Column<int>(type: "INTEGER", nullable: false),
                    DefenseIv = table.Column<int>(type: "INTEGER", nullable: false),
                    SpecialAttackIv = table.Column<int>(type: "INTEGER", nullable: false),
                    SpecialDefenseIv = table.Column<int>(type: "INTEGER", nullable: false),
                    SpeedIv = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalIvPercentage = table.Column<double>(type: "REAL", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Price = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PokemonListings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItemListings");

            migrationBuilder.DropTable(
                name: "PokemonListings");
        }
    }
}
