using System.Net;
using System.Net.Http.Json;
using sagacitysolutions.com.portal.Application.Features.Projects;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;

namespace sagacitysolutions.com.portal.WebApi.Tests.ProjectTests;

public class AddProjectTests : PortalWebHostBase
{
    public AddProjectTests(PortalWebHostFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task AddProject_ReturnsCreated_WithCorrectMetadata()
    {
        // Arrange
        var request = new AddProjectRequest(_fixture.AuthorizedTenantId, "New Integration Project");

        // Act
        var response = await _client.PostAsJsonAsync("/api/projects", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        var content = await response.Content.ReadFromJsonAsync<ProjectTestDto>();
        Assert.NotNull(content);
        Assert.NotEqual(Guid.Empty, content.Id);
        Assert.Equal(_fixture.AuthorizedTenantId, content.TenantId);
        Assert.Equal("New Integration Project", content.Name);

        // Verify database state
        using var db = _fixture.GetPortalDbContext();
        var dbProject = await db.Set<Project>().FindAsync(content.Id);
        Assert.NotNull(dbProject);
        Assert.Equal("New Integration Project", dbProject.Name);
        Assert.Equal(_fixture.AuthorizedTenantId, dbProject.TenantId);
    }

    [Fact]
    public async Task AddProject_ReturnsForbid_WhenScopeIsMissing()
    {
        // Arrange
        var request = new AddProjectRequest(_fixture.AuthorizedTenantId, "Forbidden Project");
        
        // Scope override to exclude write:projects
        TestAuthHandler.CustomScope = "read:projects read:tasks write:tasks";

        try
        {
            // Act
            var response = await _client.PostAsJsonAsync("/api/projects", request);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomScope = null;
        }
    }

    [Fact]
    public async Task AddProject_ReturnsBadRequest_WhenMetadataIsInvalid()
    {
        // Arrange
        var requestWithEmptyName = new AddProjectRequest(_fixture.AuthorizedTenantId, "");

        // Act
        var response = await _client.PostAsJsonAsync("/api/projects", requestWithEmptyName);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
