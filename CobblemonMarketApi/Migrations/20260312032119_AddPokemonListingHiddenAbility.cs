using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPokemonListingHiddenAbility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHiddenAbility",
                table: "PokemonListings",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHiddenAbility",
                table: "PokemonListings");
        }
    }
}
