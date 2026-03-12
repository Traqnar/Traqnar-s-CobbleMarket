using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPokemonAbilities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PokemonAbilities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PokedexNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    AbilityCatalogId = table.Column<int>(type: "INTEGER", nullable: false),
                    IsHidden = table.Column<bool>(type: "INTEGER", nullable: false),
                    Slot = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PokemonAbilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PokemonAbilities_AbilityCatalog_AbilityCatalogId",
                        column: x => x.AbilityCatalogId,
                        principalTable: "AbilityCatalog",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PokemonAbilities_PokemonCatalog_PokedexNumber",
                        column: x => x.PokedexNumber,
                        principalTable: "PokemonCatalog",
                        principalColumn: "PokedexNumber",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PokemonAbilities_AbilityCatalogId",
                table: "PokemonAbilities",
                column: "AbilityCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_PokemonAbilities_PokedexNumber_AbilityCatalogId_IsHidden_Slot",
                table: "PokemonAbilities",
                columns: new[] { "PokedexNumber", "AbilityCatalogId", "IsHidden", "Slot" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PokemonAbilities");
        }
    }
}
