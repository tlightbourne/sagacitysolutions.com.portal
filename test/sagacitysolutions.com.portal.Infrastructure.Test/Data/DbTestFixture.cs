using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Infrastructure.Data;
using Testcontainers.MsSql;
using Moq;
using sagacitysolutions.com.portal.Application.Identity;
using System.Data.Common;
using Microsoft.Data.SqlClient;
using Respawn;

namespace sagacitysolutions.com.portal.Infrastructure.Test.Data;

public class DbTestFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _dbContainer = new MsSqlBuilder(
        "mcr.microsoft.com/mssql/server:2025-CU5-ubuntu-24.04")
        .WithPassword("testPassword!")
        .Build();
    public string ConnectionString => _dbContainer.GetConnectionString();
    public Guid AuthorizedTenantId { get; } = Guid.NewGuid();
    public Func<Mock<IRequestContext>> RequestContextMockFactory { get; private set;}
    public DbTestFixture()
    {
        RequestContextMockFactory = () => {
            var mock =new Mock<IRequestContext>();
            mock.Setup(r => r.GetClaimValue("authorized_tenants"))
                .Returns(AuthorizedTenantId.ToString());
            return mock;
        };
    }
    public PortalDbContext GetPortalDbContext(Mock<IRequestContext>? requestContextMock = null)
    {
        var options = new DbContextOptionsBuilder<PortalDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;
        return new PortalDbContext(options, requestContextMock?.Object ?? RequestContextMockFactory().Object);
    }
    public async Task RespawnAsync()
    {
        using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        var respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.SqlServer,
            TablesToIgnore = ["__EFMigrationsHistory"]
        });
        await respawner.ResetAsync(connection);
    }
    public virtual async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
        using var db = GetPortalDbContext();
        await db.Database.EnsureCreatedAsync();
    }
    public virtual async Task DisposeAsync()
    {
        await _dbContainer.StopAsync();
    }
}