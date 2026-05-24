using Moq;
using sagacitysolutions.com.portal.Application.Identity;

namespace sagacitysolutions.com.portal.Infrastructure.Test.Data;

[CollectionDefinition("DbTest")]
public class DbTestCollection : ICollectionFixture<DbTestFixture>
{
}
[Collection("DbTest")]
public class DbTestBase : IAsyncLifetime
{
    protected readonly DbTestFixture _fixture;
    protected readonly Mock<IRequestContext> _requestContextMock;

    public DbTestBase(DbTestFixture fixture)
    {
        _fixture = fixture;
        _requestContextMock = _fixture.RequestContextMockFactory();
    }

    public async Task InitializeAsync()
    {
        await _fixture.RespawnAsync();
    }

    public async Task DisposeAsync()
    {
    }
}