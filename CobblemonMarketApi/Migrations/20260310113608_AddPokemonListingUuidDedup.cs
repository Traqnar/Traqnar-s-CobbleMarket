using CobblemonMarketApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260310113608_AddPokemonListingUuidDedup")]
    public partial class AddPokemonListingUuidDedup : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Uuid",
                table: "PokemonListings",
                type: "TEXT",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PokemonListings_Uuid",
                table: "PokemonListings",
                column: "Uuid",
                unique: true,
                filter: "\"Uuid\" <> ''");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PokemonListings_Uuid",
                table: "PokemonListings");

            migrationBuilder.DropColumn(
                name: "Uuid",
                table: "PokemonListings");
        }
    }
}
