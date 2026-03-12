using CobblemonMarketApi.Data;
using CobblemonMarketApi.Options;
using CobblemonMarketApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.Configure<MinecraftBridgeOptions>(builder.Configuration.GetSection(MinecraftBridgeOptions.SectionName));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=cobblemonmarket.db"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<IPokemonListingService, PokemonListingService>();
builder.Services.AddScoped<IItemListingService, ItemListingService>();
builder.Services.AddScoped<IPokemonSearchService, PokemonSearchService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IMinecraftBridgeService, MinecraftBridgeService>();
builder.Services.AddSingleton<IImportNotificationService, ImportNotificationService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    context.Database.Migrate();
    DbInitializer.SeedPokemonCatalog(context);
    DbInitializer.SeedPokemonFormCatalog(context);
    DbInitializer.SeedAbilityCatalog(context);
    DbInitializer.SeedPokemonAbilities(context);
}

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");
app.Run();
