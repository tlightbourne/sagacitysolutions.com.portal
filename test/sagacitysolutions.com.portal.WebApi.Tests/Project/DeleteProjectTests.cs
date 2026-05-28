using System.Net;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;

namespace sagacitysolutions.com.portal.WebApi.Tests.ProjectTests;

public class DeleteProjectTests : PortalWebHostBase
{
    public DeleteProjectTests(PortalWebHostFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task DeleteProject_ReturnsNoContent_WhenAuthorized()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project to Delete");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Authorize this project ID
        TestAuthHandler.AuthorizedProjectIds.Add(project.Id);

        // Act
        var response = await _client.DeleteAsync($"/api/projects/{project.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify it was deleted from db
        using (var db = _fixture.GetPortalDbContext())
        {
            var dbProject = await db.Set<Project>().FindAsync(project.Id);
            Assert.Null(dbProject);
        }
    }

    [Fact]
    public async Task DeleteProject_ReturnsForbid_WhenScopeIsMissing()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project with Forbidden Delete");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Authorize project ID but override scope to not include write:projects
        TestAuthHandler.AuthorizedProjectIds.Add(project.Id);
        TestAuthHandler.CustomScope = "read:projects read:tasks write:tasks";

        try
        {
            // Act
            var response = await _client.DeleteAsync($"/api/projects/{project.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomScope = null;
        }
    }

    [Fact]
    public async Task DeleteProject_ReturnsForbid_WhenProjectNotAuthorized()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Unauthorized Project to Delete");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Override CustomPortalProjectIds to a random ID to prevent automatic fallback to the route's projectId
        TestAuthHandler.CustomPortalProjectIds = Guid.NewGuid().ToString();

        try
        {
            // Act
            var response = await _client.DeleteAsync($"/api/projects/{project.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomPortalProjectIds = null;
        }
    }

    [Fact]
    public async Task DeleteProject_ReturnsNotFound_WhenProjectDoesNotExist()
    {
        // Arrange
        var nonExistentProjectId = Guid.NewGuid();

        // Use custom portal project ids claim wildcard so we pass authorization filter
        TestAuthHandler.CustomPortalProjectIds = "*";

        try
        {
            // Act
            var response = await _client.DeleteAsync($"/api/projects/{nonExistentProjectId}");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomPortalProjectIds = null;
        }
    }
}
