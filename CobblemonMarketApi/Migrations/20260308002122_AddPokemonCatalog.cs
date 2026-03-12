using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CobblemonMarketApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPokemonCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Keep this migration safe on fresh SQLite DBs where PokemonCatalog does not exist yet.
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS "PokemonCatalog" (
                    "PokedexNumber" INTEGER NOT NULL CONSTRAINT "PK_PokemonCatalog" PRIMARY KEY AUTOINCREMENT,
                    "EnglishName" TEXT NOT NULL,
                    "FrenchName" TEXT NOT NULL,
                    "DefaultImageUrl" TEXT NOT NULL
                );
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_PokemonCatalog_EnglishName"
                ON "PokemonCatalog" ("EnglishName");
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_PokemonCatalog_FrenchName"
                ON "PokemonCatalog" ("FrenchName");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_PokemonCatalog_EnglishName";""");
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_PokemonCatalog_FrenchName";""");
            migrationBuilder.Sql("""DROP TABLE IF EXISTS "PokemonCatalog";""");
        }
    }
}
