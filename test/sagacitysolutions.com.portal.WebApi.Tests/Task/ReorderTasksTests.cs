using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using sagacitysolutions.com.portal.Application.Features.Task;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.WebApi.Tests.Host;
using Xunit;

namespace sagacitysolutions.com.portal.WebApi.Tests.TaskTests;

public class ReorderTasksTests : PortalWebHostBase
{
    private static readonly System.Text.Json.JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public ReorderTasksTests(PortalWebHostFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task ReorderTasks_SameColumn_UpdatesOrderConsecutively()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Reorder Project");
        var task1Id = Guid.NewGuid();
        var task2Id = Guid.NewGuid();
        var task3Id = Guid.NewGuid();

        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();

            db.Set<WorkTask>().AddRange(
                new WorkTask(task1Id, project.Id, "Task 1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1),
                new WorkTask(task2Id, project.Id, "Task 2", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2),
                new WorkTask(task3Id, project.Id, "Task 3", WorkTaskType.Development, WorkTaskStatus.NotStarted, 3)
            );
            await db.SaveChangesAsync();
        }

        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        var requestPayload = new ReorderTasksRequest(project.Id, task1Id, WorkTaskStatus.NotStarted, 3);
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/projects/{project.Id}/tasks/reorder")
        {
            Content = JsonContent.Create(requestPayload, options: _jsonOptions)
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.EnsureSuccessStatusCode();

        using (var db = _fixture.GetPortalDbContext())
        {
            var task1 = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == task1Id);
            var task2 = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == task2Id);
            var task3 = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == task3Id);

            Assert.NotNull(task1);
            Assert.NotNull(task2);
            Assert.NotNull(task3);

            // Task 1 was moved to index 3 (last position)
            // Task 2 shifted up to index 1
            // Task 3 shifted up to index 2
            Assert.Equal(3, task1.Order);
            Assert.Equal(1, task2.Order);
            Assert.Equal(2, task3.Order);
        }
    }

    [Fact]
    public async Task ReorderTasks_BetweenColumns_UpdatesStatusAndOrders()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Cross Reorder Project");
        var taskAId = Guid.NewGuid();
        var taskBId = Guid.NewGuid();
        var taskCId = Guid.NewGuid();
        var taskDId = Guid.NewGuid();

        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();

            db.Set<WorkTask>().AddRange(
                new WorkTask(taskAId, project.Id, "Task A", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1),
                new WorkTask(taskBId, project.Id, "Task B", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2),
                new WorkTask(taskCId, project.Id, "Task C", WorkTaskType.Development, WorkTaskStatus.InProgress, 1),
                new WorkTask(taskDId, project.Id, "Task D", WorkTaskType.Development, WorkTaskStatus.InProgress, 2)
            );
            await db.SaveChangesAsync();
        }

        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        // Drag Task B (NotStarted, Order 2) to InProgress at Order 1
        var requestPayload = new ReorderTasksRequest(project.Id, taskBId, WorkTaskStatus.InProgress, 1);
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/projects/{project.Id}/tasks/reorder")
        {
            Content = JsonContent.Create(requestPayload, options: _jsonOptions)
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.EnsureSuccessStatusCode();

        using (var db = _fixture.GetPortalDbContext())
        {
            var taskA = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == taskAId);
            var taskB = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == taskBId);
            var taskC = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == taskCId);
            var taskD = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == taskDId);

            Assert.NotNull(taskA);
            Assert.NotNull(taskB);
            Assert.NotNull(taskC);
            Assert.NotNull(taskD);

            // Source column "NotStarted" updates: Task B was removed, Task A remains as Order 1
            Assert.Equal(WorkTaskStatus.NotStarted, taskA.Status);
            Assert.Equal(1, taskA.Order);

            // Target column "InProgress" updates:
            // Task B inserted at Order 1, status changed to InProgress
            // Task C shifted to Order 2
            // Task D shifted to Order 3
            Assert.Equal(WorkTaskStatus.InProgress, taskB.Status);
            Assert.Equal(1, taskB.Order);

            Assert.Equal(WorkTaskStatus.InProgress, taskC.Status);
            Assert.Equal(2, taskC.Order);

            Assert.Equal(WorkTaskStatus.InProgress, taskD.Status);
            Assert.Equal(3, taskD.Order);
        }
    }

    [Fact]
    public async Task ReorderTasks_PropagatesStatusUpwards()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Propagation Project");
        var parentId = Guid.NewGuid();
        var subtaskId = Guid.NewGuid();
        var leaf1Id = Guid.NewGuid();
        var leaf2Id = Guid.NewGuid();

        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();

            // Set up a 2-level hierarchy
            // Parent Task (InProgress)
            //   -> Subtask (InProgress)
            //        -> Leaf 1 (Completed)
            //        -> Leaf 2 (InProgress)
            var parent = new WorkTask(parentId, project.Id, "Parent Task", WorkTaskType.Development, WorkTaskStatus.InProgress, 1);
            var subtask = new WorkTask(subtaskId, project.Id, "Subtask", WorkTaskType.Development, WorkTaskStatus.InProgress, 1, parentId);
            var leaf1 = new WorkTask(leaf1Id, project.Id, "Leaf 1", WorkTaskType.Development, WorkTaskStatus.Completed, 1, subtaskId);
            var leaf2 = new WorkTask(leaf2Id, project.Id, "Leaf 2", WorkTaskType.Development, WorkTaskStatus.InProgress, 2, subtaskId);

            db.Set<WorkTask>().AddRange(parent, subtask, leaf1, leaf2);
            await db.SaveChangesAsync();
        }

        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        // Drag Leaf 2 (InProgress) to Completed at Order 2
        var requestPayload = new ReorderTasksRequest(project.Id, leaf2Id, WorkTaskStatus.Completed, 2);
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/projects/{project.Id}/tasks/reorder")
        {
            Content = JsonContent.Create(requestPayload, options: _jsonOptions)
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.EnsureSuccessStatusCode();

        using (var db = _fixture.GetPortalDbContext())
        {
            var parent = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == parentId);
            var subtask = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == subtaskId);
            var leaf1 = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == leaf1Id);
            var leaf2 = await db.Set<WorkTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == leaf2Id);

            Assert.NotNull(parent);
            Assert.NotNull(subtask);
            Assert.NotNull(leaf1);
            Assert.NotNull(leaf2);

            // Leaf tasks are both Completed
            Assert.Equal(WorkTaskStatus.Completed, leaf1.Status);
            Assert.Equal(WorkTaskStatus.Completed, leaf2.Status);

            // Subtask status should propagate upwards to Completed!
            Assert.Equal(WorkTaskStatus.Completed, subtask.Status);

            // Grandparent/Parent status should propagate upwards to Completed!
            Assert.Equal(WorkTaskStatus.Completed, parent.Status);
        }
    }

    [Fact]
    public async Task ReorderTasks_ParentTask_ReturnsBadRequest()
    {
        // Arrange
        var project = new Project(_fixture.AuthorizedTenantId, "Parent Project");
        var parentId = Guid.NewGuid();
        var childId = Guid.NewGuid();

        using (var db = _fixture.GetPortalDbContext())
        {
            await db.Set<Project>().AddAsync(project);
            await db.SaveChangesAsync();

            var parent = new WorkTask(parentId, project.Id, "Parent Task", WorkTaskType.Development, WorkTaskStatus.InProgress, 1);
            var child = new WorkTask(childId, project.Id, "Child Task", WorkTaskType.Development, WorkTaskStatus.InProgress, 1, parentId);

            db.Set<WorkTask>().AddRange(parent, child);
            await db.SaveChangesAsync();
        }

        _fixture.WebHostFactory.RequestContextMock
            .Setup(x => x.ProjectId).Returns(project.Id);

        // Attempt to reorder the parent task (which has child nodes)
        var requestPayload = new ReorderTasksRequest(project.Id, parentId, WorkTaskStatus.Completed, 1);
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/projects/{project.Id}/tasks/reorder")
        {
            Content = JsonContent.Create(requestPayload, options: _jsonOptions)
        };

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }
}
