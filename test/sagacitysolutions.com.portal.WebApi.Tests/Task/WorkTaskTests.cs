using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;

namespace sagacitysolutions.com.portal.WebApi.Tests.TaskTests;

public class WorkTaskTests : PortalWebHostBase
{
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
        var content = await response.Content.ReadFromJsonAsync<List<WorkTask>>();
        Assert.NotNull(content);
        Assert.NotEmpty(content);
    }
}