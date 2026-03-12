using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPokemonFormCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PokemonFormCatalog",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PokedexNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    FormKey = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    ApiName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    DefaultImageUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ShinyImageUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PokemonFormCatalog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PokemonFormCatalog_PokemonCatalog_PokedexNumber",
                        column: x => x.PokedexNumber,
                        principalTable: "PokemonCatalog",
                        principalColumn: "PokedexNumber",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PokemonFormCatalog_ApiName",
                table: "PokemonFormCatalog",
                column: "ApiName");

            migrationBuilder.CreateIndex(
                name: "IX_PokemonFormCatalog_PokedexNumber_FormKey",
                table: "PokemonFormCatalog",
                columns: new[] { "PokedexNumber", "FormKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PokemonFormCatalog");
        }
    }
}
