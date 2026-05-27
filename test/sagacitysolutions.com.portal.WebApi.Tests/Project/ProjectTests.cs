using System.Net.Http.Json;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;

namespace sagacitysolutions.com.portal.WebApi.Tests.ProjectTests;

public record ProjectTestDto(Guid Id, string TenantId, string Name);

public class ProjectTests : PortalWebHostBase
{
    public ProjectTests(PortalWebHostFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task GetProjects_ReturnsOk_WithOnlyAuthorizedProjects()
    {
        // Arrange
        var authorizedProject = new Project(_fixture.AuthorizedTenantId, "Authorized Test Project");
        var unauthorizedProject = new Project(_fixture.AuthorizedTenantId, "Unauthorized Test Project");

        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddRangeAsync(authorizedProject, unauthorizedProject);
            await db.SaveChangesAsync();
        }

        // Configure mock token claims with the database-generated ID
        TestAuthHandler.AuthorizedProjectIds.Add(authorizedProject.Id);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/projects");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadFromJsonAsync<List<ProjectTestDto>>();
        
        Assert.NotNull(content);
        Assert.Single(content);
        Assert.Equal(authorizedProject.Id, content.First().Id);
        Assert.Equal("Authorized Test Project", content.First().Name);
    }

    [Fact]
    public async Task GetProjects_ReturnsOk_EmptyWhenNoAuthorizedProjects()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Unrelated Project");

        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        // TestAuthHandler.AuthorizedProjectIds is kept empty, so no portal project claim holds this ID
        // (or it will default to 11111111-1111-1111-1111-111111111111, which does not match our seeded project's ID)
        
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/projects");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadFromJsonAsync<List<ProjectTestDto>>();
        
        Assert.NotNull(content);
        Assert.Empty(content);
    }
}
