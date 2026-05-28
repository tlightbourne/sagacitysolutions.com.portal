using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;

namespace sagacitysolutions.com.portal.WebApi.Tests.TaskTests;

public class WorkTaskTests : PortalWebHostBase
{
    private static readonly System.Text.Json.JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public WorkTaskTests(PortalWebHostFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task GetTasks_ReturnsOk()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            db.Set<WorkTask>().Add(new WorkTask(Guid.NewGuid(), project.Id, "Test Task", WorkTaskType.Development, WorkTaskStatus.NotStarted, 0));
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/projects/{project.Id}/tasks");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadFromJsonAsync<List<WorkTask>>(_jsonOptions);
        Assert.NotNull(content);
        Assert.NotEmpty(content);
    }

    [Fact]
    public async Task GetTasks_ReturnsForbid_WhenTasksScopeIsMissing()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        TestAuthHandler.CustomScope = "read:projects write:projects"; // missing read:tasks scope
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/projects/{project.Id}/tasks");

            // Act
            var response = await _client.SendAsync(request);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            TestAuthHandler.CustomScope = null;
        }
    }

    [Fact]
    public async Task GetTasks_ReturnsOk_WithTasksWhenWildcardAsteriskIsPresent()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            db.Set<WorkTask>().Add(new WorkTask(Guid.NewGuid(), project.Id, "Wildcard Test Task", WorkTaskType.Development, WorkTaskStatus.NotStarted, 0));
            await db.SaveChangesAsync();
        }

        // Wildcard for portal_project_ids, so the user doesn't have the specific projectId in their claim
        TestAuthHandler.CustomPortalProjectIds = "*";
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/projects/{project.Id}/tasks");

            // Act
            var response = await _client.SendAsync(request);

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadFromJsonAsync<List<WorkTask>>(_jsonOptions);
            Assert.NotNull(content);
            Assert.NotEmpty(content);
            Assert.Contains(content, t => t.Title == "Wildcard Test Task");
        }
        finally
        {
            TestAuthHandler.CustomPortalProjectIds = null;
        }
    }
}