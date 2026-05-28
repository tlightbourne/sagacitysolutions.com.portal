using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Infrastructure.Data;
using System.Linq;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace sagacitysolutions.com.portal.WebApi.Tests.Host
{
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public static List<Guid> AuthorizedProjectIds { get; } = new List<Guid>();
        public static string? CustomScope { get; set; } = null;
        public static string? CustomPortalProjectIds { get; set; } = null;

        public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var scopes = CustomScope ?? "read:projects write:projects read:tasks write:tasks";
            var claimsList = new List<Claim>
            {
                new Claim(ClaimTypes.Name, "TestUser"),
                new Claim("scope", scopes),
                new Claim("tenant_ids", "zzp1s6s0mqqc"),
                new Claim("authorized_tenants", "zzp1s6s0mqqc")
            };

            // If custom portal_project_ids is declared, use it. Otherwise use list, dynamic route, or fallback.
            if (CustomPortalProjectIds != null)
            {
                claimsList.Add(new Claim("portal_project_ids", CustomPortalProjectIds));
            }
            else if (AuthorizedProjectIds.Any())
            {
                claimsList.Add(new Claim("portal_project_ids", string.Join(",", AuthorizedProjectIds)));
            }
            else if (Context.Request.RouteValues.TryGetValue("projectId", out var projectIdObj) && projectIdObj != null)
            {
                claimsList.Add(new Claim("portal_project_ids", projectIdObj.ToString()!));
            }
            else
            {
                claimsList.Add(new Claim("portal_project_ids", "11111111-1111-1111-1111-111111111111"));
            }

            var identity = new ClaimsIdentity(claimsList, "Bearer");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "Bearer");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

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
            // Configure database connection and provider settings dynamically
            builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);

            builder.ConfigureServices(services =>
            {
                var requestContextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IRequestContext));
                if (requestContextDescriptor != null)
                {
                    services.Remove(requestContextDescriptor);
                }
                services.AddScoped(s => RequestContextMock.Object);

                // Remove all existing authentication configuration options to prevent duplicate schemes
                var authOptionsDescriptors = services.Where(d => d.ServiceType == typeof(IConfigureOptions<AuthenticationOptions>)).ToList();
                foreach (var descriptor in authOptionsDescriptors)
                {
                    services.Remove(descriptor);
                }

                // Mock Bearer Authentication and Authorization to bypass real OIDC endpoints
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Bearer";
                    options.DefaultChallengeScheme = "Bearer";
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Bearer", options => {});
            });
        }
    }
}