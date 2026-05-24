using Moq;

namespace sagacitysolutions.com.portal.WebApi.Tests.Host;

[CollectionDefinition("PortalWebHost")]
public class PortalWebHostCollection : ICollectionFixture<PortalWebHostFixture>
{
}
[Collection("PortalWebHost")]
public class PortalWebHostBase : IAsyncLifetime
{
    protected readonly PortalWebHostFixture _fixture;

    protected readonly HttpClient _client;

    public PortalWebHostBase(PortalWebHostFixture fixture)
    {
        _fixture = fixture;
        _client = _fixture.WebHostFactory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        _fixture.WebHostFactory.RequestContextMock.Invocations.Clear();
        _fixture.WebHostFactory.RequestContextMock.Reset();
        await _fixture.RespawnAsync();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
    }
}