namespace sagacitysolutions.com.portal.Infrastructure.Data;

using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Application.Repository.Specifications;

public class ReadOnlyRepository : IReadOnlyRepository
{
    private readonly PortalDbContext _context;

    public ReadOnlyRepository(PortalDbContext context)
    {
        _context = context;
    }

    private IQueryable<TEntity> GetQuery<TEntity>(IQueryable<TEntity> query,
        ISpecification<TEntity> spec) where TEntity : class
    {
        var builtQuery = query;
        if (spec.Criterion != null)
            builtQuery = builtQuery.Where(spec.Criterion);
        if (spec.Includes == null || !spec.Includes.Any())
            return builtQuery;
        return spec.Includes.Aggregate(builtQuery, (current, include) => current.Include(include));
    }

    public Task<TEntity?> FirstOrDefaultAsync<TEntity>(ISpecification<TEntity> specification, CancellationToken cancellationToken = default) where TEntity : class
    {
        return GetQuery(_context.Set<TEntity>().AsNoTracking(), specification)
            .FirstOrDefaultAsync(specification.Criterion, cancellationToken);
    }

    public async Task<IEnumerable<TEntity>> ToListAsync<TEntity>(ISpecification<TEntity> specification, CancellationToken cancellationToken = default) where TEntity : class
    {
        return await GetQuery(_context.Set<TEntity>().AsNoTracking(), specification)
            .ToListAsync(cancellationToken);
    }
}