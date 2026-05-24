using sagacitysolutions.com.portal.Infrastructure.Test.Data;

namespace sagacitysolutions.com.portal.WebApi.Tests.Host;

public class PortalWebHostFixture : DbTestFixture
{
    public PortalWebHostFactory WebHostFactory { get; private set; }

#pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    public PortalWebHostFixture() : base()
#pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        WebHostFactory = new PortalWebHostFactory(ConnectionString, RequestContextMockFactory());
    }
    public override async Task DisposeAsync()
    {
        WebHostFactory.Dispose();
        await base.DisposeAsync();
    }
}