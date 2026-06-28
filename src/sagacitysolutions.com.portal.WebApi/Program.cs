using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using sagacitysolutions.com.portal.Application.Features.Task;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Infrastructure.Data;
using sagacitysolutions.com.portal.WebApi;
using sagacitysolutions.com.portal.WebApi.Behaviors;
using sagacitysolutions.com.portal.WebApi.Routes;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IRequestContext, RequestContext>();
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddDbContext<PortalDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);
});
builder.Services.AddTransient<IReadOnlyRepository, ReadOnlyRepository>();
builder.Services.AddTransient(typeof(IWriteRepository<>), typeof(WriteRepository<>));
builder.Services.AddTransient<ITaskStatusPropagator, TaskStatusPropagator>();
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblies(
        typeof(Program).Assembly,
        typeof(ReadOnlyRepository).Assembly,
        typeof(GetProjectTasksHandler).Assembly
        );
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});

// Configure JWT Bearer Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var authority = builder.Configuration["Authentication:Authority"] ?? builder.Configuration["LOGTO_ENDPOINT"] ?? "http://localhost:3001";
        if (!authority.EndsWith("/oidc"))
        {
            authority = authority.TrimEnd('/') + "/oidc";
        }
        options.Authority = authority;
        options.Audience = builder.Configuration["Authentication:Audience"] ?? builder.Configuration["PORTAL_API_RESOURCE"] ?? "http://localhost:5092";
        options.RequireHttpsMetadata = false;             // Allow HTTP in dev or internal container apps
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var identity = context.Principal?.Identity as ClaimsIdentity;
                if (identity != null)
                {
                    // Copy tenant_ids to authorized_tenants to align with PortalDbContext query filter
                    var tenantIdsClaim = identity.FindFirst("tenant_ids");
                    if (tenantIdsClaim != null && !identity.HasClaim(c => c.Type == "authorized_tenants"))
                    {
                        identity.AddClaim(new Claim("authorized_tenants", tenantIdsClaim.Value));
                    }
                }
                return Task.CompletedTask;
            }
        };
    });

// Configure Dynamic Project-based Authorization
builder.Services.AddSingleton<IAuthorizationPolicyProvider, ProjectAuthorizationPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, ProjectAccessHandler>();
builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapProjectRoutes();
app.MapTaskRoutes();

// Database Initialization & Validation
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PortalDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();