using System.Net;
using System.Net.Http.Json;
using sagacitysolutions.com.portal.Application.Features.Projects;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;

namespace sagacitysolutions.com.portal.WebApi.Tests.ProjectTests;

public class UpdateProjectTests : PortalWebHostBase
{
    public UpdateProjectTests(PortalWebHostFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task UpdateProject_ReturnsOk_WhenAuthorized()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project to Update");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Authorize this project ID
        TestAuthHandler.AuthorizedProjectIds.Add(project.Id);

        var request = new UpdateProjectRequest(project.Id, "Updated Project Name", ProjectStatus.Completed);

        // Act
        var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadFromJsonAsync<ProjectTestDto>();
        Assert.NotNull(content);
        Assert.Equal(project.Id, content.Id);
        Assert.Equal("Updated Project Name", content.Name);
        Assert.Equal("Completed", content.Status);

        // Verify it was updated in db
        using (var db = _fixture.GetPortalDbContext())
        {
            var dbProject = await db.Set<Project>().FindAsync(project.Id);
            Assert.NotNull(dbProject);
            Assert.Equal("Updated Project Name", dbProject.Name);
            Assert.Equal(ProjectStatus.Completed, dbProject.Status);
        }
    }

    [Fact]
    public async Task UpdateProject_ReturnsForbid_WhenScopeIsMissing()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project to Update Forbidden");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Authorize project ID but override scope to not include write:projects
        TestAuthHandler.AuthorizedProjectIds.Add(project.Id);
        TestAuthHandler.CustomScope = "read:projects read:tasks write:tasks";

        var request = new UpdateProjectRequest(project.Id, "Scope Restricted Update", ProjectStatus.Active);

        try
        {
            // Act
            var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}", request);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomScope = null;
        }
    }

    [Fact]
    public async Task UpdateProject_ReturnsForbid_WhenProjectNotAuthorized()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project Not Authorized");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Override CustomPortalProjectIds to a random ID to prevent access
        TestAuthHandler.CustomPortalProjectIds = Guid.NewGuid().ToString();

        var request = new UpdateProjectRequest(project.Id, "Unauthorized Project Update", ProjectStatus.Active);

        try
        {
            // Act
            var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}", request);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomPortalProjectIds = null;
        }
    }

    [Fact]
    public async Task UpdateProject_ReturnsBadRequest_WhenMetadataIsInvalid()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project with Invalid Update Metadata");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Authorize this project ID
        TestAuthHandler.AuthorizedProjectIds.Add(project.Id);

        var requestWithEmptyName = new UpdateProjectRequest(project.Id, "", ProjectStatus.Active);

        // Act
        var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}", requestWithEmptyName);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProject_ReturnsBadRequest_WhenProjectIdMismatch()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Project Mismatch");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // Authorize this project ID
        TestAuthHandler.AuthorizedProjectIds.Add(project.Id);

        var requestWithMismatchId = new UpdateProjectRequest(Guid.NewGuid(), "Mismatched Update", ProjectStatus.Active);

        // Act
        var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}", requestWithMismatchId);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProject_ReturnsNotFound_WhenProjectDoesNotExist()
    {
        // Arrange
        var nonExistentProjectId = Guid.NewGuid();

        // Use custom portal project ids claim wildcard so we pass authorization filter
        TestAuthHandler.CustomPortalProjectIds = "*";

        var request = new UpdateProjectRequest(nonExistentProjectId, "Non-existent Project Update", ProjectStatus.Active);

        try
        {
            // Act
            var response = await _client.PutAsJsonAsync($"/api/projects/{nonExistentProjectId}", request);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomPortalProjectIds = null;
        }
    }
}
