using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddShowcasesAndListingOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.CreateTable(
                name: "Showcases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Showcases", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PokemonListings_ShowcaseId",
                table: "PokemonListings",
                column: "ShowcaseId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemListings_ShowcaseId",
                table: "ItemListings",
                column: "ShowcaseId");
            
            migrationBuilder.InsertData(
                table: "Showcases",
                columns: new[] { "Id", "Name", "Description", "CreatedAtUtc", "UpdatedAtUtc" },
                values: new object[] { 0, "Legacy Showcase", "Auto-created to attach existing listings", DateTime.UtcNow, DateTime.UtcNow });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemListings_Showcases_ShowcaseId",
                table: "ItemListings");

            migrationBuilder.DropForeignKey(
                name: "FK_PokemonListings_Showcases_ShowcaseId",
                table: "PokemonListings");

            migrationBuilder.DropTable(
                name: "Showcases");

            migrationBuilder.DropIndex(
                name: "IX_PokemonListings_ShowcaseId",
                table: "PokemonListings");

            migrationBuilder.DropIndex(
                name: "IX_ItemListings_ShowcaseId",
                table: "ItemListings");

            migrationBuilder.DropColumn(
                name: "ShowcaseId",
                table: "PokemonListings");

            migrationBuilder.DropColumn(
                name: "ShowcaseId",
                table: "ItemListings");
        }
    }
}
