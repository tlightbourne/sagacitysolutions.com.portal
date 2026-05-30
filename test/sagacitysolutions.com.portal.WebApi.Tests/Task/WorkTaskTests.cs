using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using sagacitysolutions.com.portal.Application.Features.Task;
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
            await db.SaveChangesAsync();

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
            await db.SaveChangesAsync();

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

    [Fact]
    public async Task CreateTask_ValidRequest_ReturnsCreatedAndPersists()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        var taskRequest = new AddTaskRequest(
            Id: Guid.NewGuid(),
            ProjectId: project.Id,
            Title: "Newly Created Task",
            Type: WorkTaskType.Development,
            ParentId: null,
            Description: "Some Description",
            Hours: 8,
            Status: WorkTaskStatus.NotStarted
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/tasks", taskRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Created, response.StatusCode);
        var createdTask = await response.Content.ReadFromJsonAsync<WorkTask>(_jsonOptions);
        Assert.NotNull(createdTask);
        Assert.Equal(taskRequest.Title, createdTask.Title);
        Assert.Equal(taskRequest.Description, createdTask.Description);
        Assert.Equal(taskRequest.Hours, createdTask.Hours);

        using (var db = _fixture.GetPortalDbContext())
        {
            var dbTask = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == createdTask.Id);
            Assert.NotNull(dbTask);
            Assert.Equal(taskRequest.Title, dbTask.Title);
        }
    }

    [Fact]
    public async Task CreateTask_NestingExceeded_ReturnsBadRequest()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        var rootTask = new WorkTask(Guid.NewGuid(), project.Id, "Level 0 Root", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        var level1Task = new WorkTask(Guid.NewGuid(), project.Id, "Level 1 Subtask", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1, parentId: rootTask.Id);

        using (var db = _fixture.GetPortalDbContext())
        {
            db.Set<WorkTask>().Add(rootTask);
            db.Set<WorkTask>().Add(level1Task);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        // Try adding a level 2 task (which is allowed) under level 1
        var level2Id = Guid.NewGuid();
        var level2Request = new AddTaskRequest(
            Id: level2Id,
            ProjectId: project.Id,
            Title: "Level 2 Sub-subtask",
            Type: WorkTaskType.Development,
            ParentId: level1Task.Id
        );
        var response2 = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/tasks", level2Request);
        Assert.Equal(System.Net.HttpStatusCode.Created, response2.StatusCode);

        // Now try adding a level 3 task (which exceeds 2 nesting levels) under level 2
        var level3Request = new AddTaskRequest(
            Id: Guid.NewGuid(),
            ProjectId: project.Id,
            Title: "Level 3 - Should fail",
            Type: WorkTaskType.Development,
            ParentId: level2Id
        );

        // Act
        var response3 = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/tasks", level3Request);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response3.StatusCode);
        var err = await response3.Content.ReadAsStringAsync();
        Assert.Contains("Nesting level cannot exceed 2 levels", err);
    }

    [Fact]
    public async Task CreateTask_PropagatesStatusUpwards()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        var rootTask = new WorkTask(Guid.NewGuid(), project.Id, "Root Task", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        using (var db = _fixture.GetPortalDbContext())
        {
            db.Set<WorkTask>().Add(rootTask);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        var subtaskRequest = new AddTaskRequest(
            Id: Guid.NewGuid(),
            ProjectId: project.Id,
            Title: "Active Subtask",
            Type: WorkTaskType.Development,
            ParentId: rootTask.Id,
            Status: WorkTaskStatus.InProgress
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/tasks", subtaskRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Created, response.StatusCode);

        using (var db = _fixture.GetPortalDbContext())
        {
            var updatedRoot = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == rootTask.Id);
            Assert.NotNull(updatedRoot);
            Assert.Equal(WorkTaskStatus.InProgress, updatedRoot.Status); // status propagated upwards on task creation!
        }
    }

    [Fact]
    public async Task UpdateTask_LeafStatusChange_PropagatesStatusUpwards()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        var rootTask = new WorkTask(Guid.NewGuid(), project.Id, "Root Task", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        var subTask = new WorkTask(Guid.NewGuid(), project.Id, "Subtask", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1, parentId: rootTask.Id);
        using (var db = _fixture.GetPortalDbContext())
        {
            db.Set<WorkTask>().Add(rootTask);
            db.Set<WorkTask>().Add(subTask);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        var updateRequest = new UpdateTaskRequest(
            ProjectId: project.Id,
            Id: subTask.Id,
            Title: "Subtask Updated",
            Type: WorkTaskType.Research,
            Status: WorkTaskStatus.Completed,
            Hours: 4
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}/tasks/{subTask.Id}", updateRequest);

        // Assert
        response.EnsureSuccessStatusCode();
        using (var db = _fixture.GetPortalDbContext())
        {
            var updatedRoot = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == rootTask.Id);
            Assert.NotNull(updatedRoot);
            Assert.Equal(WorkTaskStatus.Completed, updatedRoot.Status); // status propagated upwards to Completed!
        }
    }

    [Fact]
    public async Task UpdateTask_ParentDirectStatusChange_ReturnsBadRequest()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        var rootTask = new WorkTask(Guid.NewGuid(), project.Id, "Root Task", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        var subTask = new WorkTask(Guid.NewGuid(), project.Id, "Subtask", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1, parentId: rootTask.Id);
        using (var db = _fixture.GetPortalDbContext())
        {
            db.Set<WorkTask>().Add(rootTask);
            db.Set<WorkTask>().Add(subTask);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        var updateRequest = new UpdateTaskRequest(
            ProjectId: project.Id,
            Id: rootTask.Id,
            Title: "Root Task Direct Attempt",
            Type: WorkTaskType.Research,
            Status: WorkTaskStatus.Completed
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/api/projects/{project.Id}/tasks/{rootTask.Id}", updateRequest);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        var err = await response.Content.ReadAsStringAsync();
        Assert.Contains("Parent task status cannot be modified directly", err);
    }

    [Fact]
    public async Task DeleteTask_ParentTask_RecursiveCascadeDeletesChildren()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        var rootTask = new WorkTask(Guid.NewGuid(), project.Id, "Root Task", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        var subTask = new WorkTask(Guid.NewGuid(), project.Id, "Subtask", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1, parentId: rootTask.Id);
        using (var db = _fixture.GetPortalDbContext())
        {
            db.Set<WorkTask>().Add(rootTask);
            db.Set<WorkTask>().Add(subTask);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        // Act
        var response = await _client.DeleteAsync($"/api/projects/{project.Id}/tasks/{rootTask.Id}");

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);
        using (var db = _fixture.GetPortalDbContext())
        {
            var dbRoot = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == rootTask.Id);
            var dbSub = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == subTask.Id);
            Assert.Null(dbRoot);
            Assert.Null(dbSub); // Cascade deleted successfully!
        }
    }

    [Fact]
    public async Task DeleteTask_PropagatesStatusUpwards()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();
        }

        var rootTask = new WorkTask(Guid.NewGuid(), project.Id, "Root Task", WorkTaskType.Research, WorkTaskStatus.InProgress, 1);
        var subTask1 = new WorkTask(Guid.NewGuid(), project.Id, "Subtask 1", WorkTaskType.Research, WorkTaskStatus.InProgress, 1, parentId: rootTask.Id);
        var subTask2 = new WorkTask(Guid.NewGuid(), project.Id, "Subtask 2", WorkTaskType.Research, WorkTaskStatus.NotStarted, 2, parentId: rootTask.Id);
        using (var db = _fixture.GetPortalDbContext())
        {
            db.Set<WorkTask>().Add(rootTask);
            db.Set<WorkTask>().Add(subTask1);
            db.Set<WorkTask>().Add(subTask2);
            await db.SaveChangesAsync();
        }
        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        // Act - Delete subTask1 which was InProgress, leaving only subTask2 (NotStarted)
        var response = await _client.DeleteAsync($"/api/projects/{project.Id}/tasks/{subTask1.Id}");

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);
        using (var db = _fixture.GetPortalDbContext())
        {
            var updatedRoot = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == rootTask.Id);
            Assert.NotNull(updatedRoot);
            Assert.Equal(WorkTaskStatus.NotStarted, updatedRoot.Status); // status propagated upwards and recalculated to NotStarted!
        }
    }

    [Fact]
    public void WorkTask_CalculateStatusFromChildren_ValidatesStateMatrix()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        
        // Scenario 1: All children Completed -> Parent is Completed
        var parent1 = new WorkTask(Guid.NewGuid(), projectId, "Parent 1", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        parent1.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C1", WorkTaskType.Development, WorkTaskStatus.Completed, 1));
        parent1.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C2", WorkTaskType.Development, WorkTaskStatus.Completed, 2));
        Assert.Equal(WorkTaskStatus.Completed, parent1.CalculateStatusFromChildren());

        // Scenario 2: At least one InProgress -> Parent is InProgress
        var parent2 = new WorkTask(Guid.NewGuid(), projectId, "Parent 2", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        parent2.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1));
        parent2.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C2", WorkTaskType.Development, WorkTaskStatus.InProgress, 2));
        Assert.Equal(WorkTaskStatus.InProgress, parent2.CalculateStatusFromChildren());

        // Scenario 3: Mixed Completed & NotStarted -> Parent is InProgress
        var parent3 = new WorkTask(Guid.NewGuid(), projectId, "Parent 3", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        parent3.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C1", WorkTaskType.Development, WorkTaskStatus.Completed, 1));
        parent3.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C2", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2));
        Assert.Equal(WorkTaskStatus.InProgress, parent3.CalculateStatusFromChildren());

        // Scenario 4: All non-started are OnHold (mix of NotStarted and OnHold) -> Parent is OnHold
        var parent4 = new WorkTask(Guid.NewGuid(), projectId, "Parent 4", WorkTaskType.Research, WorkTaskStatus.NotStarted, 1);
        parent4.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1));
        parent4.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C2", WorkTaskType.Development, WorkTaskStatus.OnHold, 2));
        Assert.Equal(WorkTaskStatus.OnHold, parent4.CalculateStatusFromChildren());

        // Scenario 5: All children NotStarted -> Parent is NotStarted
        var parent5 = new WorkTask(Guid.NewGuid(), projectId, "Parent 5", WorkTaskType.Research, WorkTaskStatus.InProgress, 1);
        parent5.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1));
        parent5.Children.Add(new WorkTask(Guid.NewGuid(), projectId, "C2", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2));
        Assert.Equal(WorkTaskStatus.NotStarted, parent5.CalculateStatusFromChildren());
    }
}