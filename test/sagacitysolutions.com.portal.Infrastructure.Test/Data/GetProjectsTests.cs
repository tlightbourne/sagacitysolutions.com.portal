using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Application.Features.Projects.Queries;
using sagacitysolutions.com.portal.Domain.Entities;
using sagacitysolutions.com.portal.Infrastructure.Data;

namespace sagacitysolutions.com.portal.Infrastructure.Test.Data;

public class GetProjectsTests : DbTestBase
{
    public GetProjectsTests(DbTestFixture fixture) : base(fixture)
    {
    }

    [Fact]
    public async Task GetProjects_ReturnsOnlySpecifiedProjects()
    {
        // Arrange
        using var db = _fixture.GetPortalDbContext();
        
        var project1 = new Project(_fixture.AuthorizedTenantId, "Project Alpha");
        var project2 = new Project(_fixture.AuthorizedTenantId, "Project Beta");
        var project3 = new Project(_fixture.AuthorizedTenantId, "Project Gamma");
        
        await db.Set<Project>().AddRangeAsync(project1, project2, project3);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var repository = new ReadOnlyRepository(db);
        var spec = new GetProjectsSpecification(new List<Guid> { project1.Id, project3.Id });

        // Act
        var result = await repository.ToListAsync(spec);

        // Assert
        Assert.Equal(2, result.Count());
        Assert.Contains(result, p => p.Id == project1.Id);
        Assert.Contains(result, p => p.Id == project3.Id);
        Assert.DoesNotContain(result, p => p.Id == project2.Id);
    }

    [Fact]
    public async Task GetProjects_ReturnsEmptyWhenNoProjectIdsMatch()
    {
        // Arrange
        using var db = _fixture.GetPortalDbContext();
        
        var project1 = new Project(_fixture.AuthorizedTenantId, "Project Alpha");
        var project2 = new Project(_fixture.AuthorizedTenantId, "Project Beta");
        
        await db.Set<Project>().AddRangeAsync(project1, project2);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var repository = new ReadOnlyRepository(db);
        var spec = new GetProjectsSpecification(new List<Guid> { Guid.NewGuid() });

        // Act
        var result = await repository.ToListAsync(spec);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProjects_FiltersOutAuthorizedProjectIdsIfTenantIsUnauthorized()
    {
        // Arrange
        using var db = _fixture.GetPortalDbContext();
        
        var unauthorizedTenantId = Guid.NewGuid().ToString("N");
        var authorizedProject = new Project(_fixture.AuthorizedTenantId, "Authorized Tenant Project");
        var unauthorizedProject = new Project(unauthorizedTenantId, "Unauthorized Tenant Project");
        
        await db.Set<Project>().AddRangeAsync(authorizedProject, unauthorizedProject);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var repository = new ReadOnlyRepository(db);
        var spec = new GetProjectsSpecification(new List<Guid> { authorizedProject.Id, unauthorizedProject.Id });

        // Act
        var result = await repository.ToListAsync(spec);

        // Assert
        Assert.Single(result);
        Assert.Contains(result, p => p.Id == authorizedProject.Id);
        Assert.DoesNotContain(result, p => p.Id == unauthorizedProject.Id);
    }
}
