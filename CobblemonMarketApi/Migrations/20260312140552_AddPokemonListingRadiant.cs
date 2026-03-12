using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPokemonListingRadiant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRadiant",
                table: "PokemonListings",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRadiant",
                table: "PokemonListings");
        }
    }
}
