using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPokemonListingUuidAndForm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Form",
                table: "PokemonListings",
                type: "TEXT",
                maxLength: 80,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Form",
                table: "PokemonListings");
        }
    }
}
