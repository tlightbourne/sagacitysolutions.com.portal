using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Application.Features.Task.Queries;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.Infrastructure.Data;

namespace sagacitysolutions.com.portal.Infrastructure.Test.Data;

public class GetProjectTasksTests : DbTestBase
{
    public GetProjectTasksTests(DbTestFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task GetProjectTasks_ReturnsTasksForProject()
    {
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        // Arrange
        using (var projectDb = _fixture.GetPortalDbContext())
        {
            await projectDb.Set<Project>().AddAsync(project);
            await projectDb.SaveChangesAsync();
        }
        _requestContextMock.Setup(r => r.ProjectId).Returns(project.Id);
        using var db = _fixture.GetPortalDbContext(_requestContextMock);
        var task1 = new WorkTask(Guid.NewGuid(), project.Id, "Task 1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1);
        var task2 = new WorkTask(Guid.NewGuid(), project.Id, "Task 2", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2);
        db.Set<WorkTask>().AddRange(task1, task2);
        await db.SaveChangesAsync();

        // Act
        var tasks = await new ReadOnlyRepository(db).ToListAsync(new GetProjectTasksSpecification());

        // Assert
        Assert.Equal(2, tasks.Count());
    }
    [Fact]
    public async Task GetProjectTasks_ReturnsTasksAndTheirChildrenForProject()
    {
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        // Arrange
        using (var projectDb = _fixture.GetPortalDbContext())
        {
            await projectDb.Set<Project>().AddAsync(project);
            await projectDb.SaveChangesAsync();
        }
        _requestContextMock.Setup(r => r.ProjectId).Returns(project.Id);
        using var db = _fixture.GetPortalDbContext(_requestContextMock);
        var task1 = new WorkTask(Guid.NewGuid(), project.Id, "Task 1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1);
        var task2 = new WorkTask(Guid.NewGuid(), project.Id, "Child Task of Task 1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2,
            parentId: task1.Id);
        db.Set<WorkTask>().AddRange(task1, task2);
        await db.SaveChangesAsync();

        // Act
        var tasks = await new ReadOnlyRepository(db).ToListAsync(new GetProjectTasksSpecification());

        // Assert
        Assert.Single(tasks);
        Assert.Single(tasks.First().Children);
    }
    [Fact]
    public async Task GetProjectTasks_AppliesProjectIdGlobalQueryFilter()
    {
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        // Arrange
        using var db = _fixture.GetPortalDbContext();
        await db.Set<Project>().AddAsync(project);
        var task1 = new WorkTask(Guid.NewGuid(), project.Id, "Task 1", WorkTaskType.Development, WorkTaskStatus.NotStarted, 1);
        var task2 = new WorkTask(Guid.NewGuid(), project.Id, "Task 2", WorkTaskType.Development, WorkTaskStatus.NotStarted, 2);
        db.Set<WorkTask>().AddRange(task1, task2);
        await db.SaveChangesAsync();

        // Act
        var tasks = await new ReadOnlyRepository(db).ToListAsync(new GetProjectTasksSpecification());

        // Assert
        Assert.Empty(tasks);
    }
    [Fact]
    public async Task GetProjectTasks_AppliesTenantIdGlobalQueryFilter()
    {
        var unauthorizedTenantId = Guid.NewGuid().ToString("N");
        var project = new Project(unauthorizedTenantId, "Test Project");
        // Arrange
        using var db = _fixture.GetPortalDbContext();
        await db.Set<Project>().AddAsync(project);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        // Act
        var result = await db.Set<Project>().ToListAsync();

        // Assert
        Assert.Empty(result);
    }
    [Fact]
    public async Task GetProjectTasks_UsesTenantIdGlobalQueryFilter()
    {
        var project = new Project(_fixture.AuthorizedTenantId, "Test Project");
        // Arrange
        using var db = _fixture.GetPortalDbContext();
        await db.Set<Project>().AddAsync(project);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        // Act
        var result = await db.Set<Project>().ToListAsync();

        // Assert
        Assert.NotEmpty(result);
    }
}