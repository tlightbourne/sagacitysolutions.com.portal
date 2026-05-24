using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Application.Features.Task;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Infrastructure.Data;
using sagacitysolutions.com.portal.WebApi;
using sagacitysolutions.com.portal.WebApi.Routes;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddScoped<IRequestContext, RequestContext>();
builder.Services.AddDbContext<PortalDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddTransient<IReadOnlyRepository, ReadOnlyRepository>();
builder.Services.AddTransient(typeof(IWriteRepository<>), typeof(WriteRepository<>));
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(
    typeof(Program).Assembly,
    typeof(ReadOnlyRepository).Assembly,
    typeof(GetProjectTasksHandler).Assembly));
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapTaskRoutes();

app.Run();