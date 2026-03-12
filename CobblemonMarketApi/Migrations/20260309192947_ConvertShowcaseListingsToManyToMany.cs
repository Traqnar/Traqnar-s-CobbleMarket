using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class ConvertShowcaseListingsToManyToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemListings_Showcases_ShowcaseId",
                table: "ItemListings");

            migrationBuilder.DropForeignKey(
                name: "FK_PokemonListings_Showcases_ShowcaseId",
                table: "PokemonListings");

            migrationBuilder.DropIndex(
                name: "IX_PokemonListings_ShowcaseId",
                table: "PokemonListings");

            migrationBuilder.DropIndex(
                name: "IX_ItemListings_ShowcaseId",
                table: "ItemListings");

            migrationBuilder.CreateTable(
                name: "ShowcaseItemListings",
                columns: table => new
                {
                    ShowcaseId = table.Column<int>(type: "INTEGER", nullable: false),
                    ItemListingId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShowcaseItemListings", x => new { x.ShowcaseId, x.ItemListingId });
                    table.ForeignKey(
                        name: "FK_ShowcaseItemListings_ItemListings_ItemListingId",
                        column: x => x.ItemListingId,
                        principalTable: "ItemListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShowcaseItemListings_Showcases_ShowcaseId",
                        column: x => x.ShowcaseId,
                        principalTable: "Showcases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShowcasePokemonListings",
                columns: table => new
                {
                    ShowcaseId = table.Column<int>(type: "INTEGER", nullable: false),
                    PokemonListingId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShowcasePokemonListings", x => new { x.ShowcaseId, x.PokemonListingId });
                    table.ForeignKey(
                        name: "FK_ShowcasePokemonListings_PokemonListings_PokemonListingId",
                        column: x => x.PokemonListingId,
                        principalTable: "PokemonListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShowcasePokemonListings_Showcases_ShowcaseId",
                        column: x => x.ShowcaseId,
                        principalTable: "Showcases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShowcaseItemListings_ItemListingId",
                table: "ShowcaseItemListings",
                column: "ItemListingId");

            migrationBuilder.CreateIndex(
                name: "IX_ShowcasePokemonListings_PokemonListingId",
                table: "ShowcasePokemonListings",
                column: "PokemonListingId");

            migrationBuilder.Sql("""
                INSERT INTO ShowcasePokemonListings (ShowcaseId, PokemonListingId)
                SELECT ShowcaseId, Id
                FROM PokemonListings
                WHERE ShowcaseId IS NOT NULL;
                """);

            migrationBuilder.Sql("""
                INSERT INTO ShowcaseItemListings (ShowcaseId, ItemListingId)
                SELECT ShowcaseId, Id
                FROM ItemListings
                WHERE ShowcaseId IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "ShowcaseId",
                table: "PokemonListings");

            migrationBuilder.DropColumn(
                name: "ShowcaseId",
                table: "ItemListings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ShowcaseId",
                table: "PokemonListings",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ShowcaseId",
                table: "ItemListings",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""
                UPDATE PokemonListings
                SET ShowcaseId = (
                    SELECT ShowcaseId
                    FROM ShowcasePokemonListings
                    WHERE ShowcasePokemonListings.PokemonListingId = PokemonListings.Id
                    LIMIT 1
                );
                """);

            migrationBuilder.Sql("""
                UPDATE ItemListings
                SET ShowcaseId = (
                    SELECT ShowcaseId
                    FROM ShowcaseItemListings
                    WHERE ShowcaseItemListings.ItemListingId = ItemListings.Id
                    LIMIT 1
                );
                """);

            migrationBuilder.DropTable(
                name: "ShowcaseItemListings");

            migrationBuilder.DropTable(
                name: "ShowcasePokemonListings");

            migrationBuilder.CreateIndex(
                name: "IX_PokemonListings_ShowcaseId",
                table: "PokemonListings",
                column: "ShowcaseId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemListings_ShowcaseId",
                table: "ItemListings",
                column: "ShowcaseId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemListings_Showcases_ShowcaseId",
                table: "ItemListings",
                column: "ShowcaseId",
                principalTable: "Showcases",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PokemonListings_Showcases_ShowcaseId",
                table: "PokemonListings",
                column: "ShowcaseId",
                principalTable: "Showcases",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
