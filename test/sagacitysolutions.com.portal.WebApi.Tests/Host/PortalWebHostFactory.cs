using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Infrastructure.Data;
namespace sagacitysolutions.com.portal.WebApi.Tests.Host
{
    public class PortalWebHostFactory : WebApplicationFactory<Program>
    {
        private string _connectionString;
        public Mock<IRequestContext> RequestContextMock {get; private set;}

        public PortalWebHostFactory(string connectionString, Mock<IRequestContext> requestContextMock) : base()
        {
            _connectionString = connectionString;
            RequestContextMock = requestContextMock;
        }
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                var requestContextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IRequestContext));
                if (requestContextDescriptor != null)
                {
                    services.Remove(requestContextDescriptor);
                }
                services.AddScoped(s => RequestContextMock.Object);

                // Remove the existing DbContext registration
                var dbContextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<PortalDbContext>));
                if (dbContextDescriptor != null)
                {
                    services.Remove(dbContextDescriptor);
                }

                // Add a new DbContext registration for testing
                services.AddDbContext<PortalDbContext>(options =>
                {
                    options.UseSqlServer(_connectionString);
                });
            });
        }
    }
}