using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Application.Repository;

namespace sagacitysolutions.com.portal.Infrastructure.Data;

public class WriteRepository<TEntity> : IWriteRepository<TEntity> where TEntity : class
{
    private readonly PortalDbContext _context;

    public WriteRepository(PortalDbContext context)
    {
        _context = context;
    }
    
    public async Task<TEntity> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity =await _context.Set<TEntity>().FindAsync(id, cancellationToken);
        if (entity == null)
        {
            throw new InvalidOperationException($"Entity of type {typeof(TEntity).Name} with ID {id} not found.");
        }
        return entity;
    }

    public async Task AddAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        await _context.Set<TEntity>().AddAsync(entity, cancellationToken);
    }

    public Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        _context.Set<TEntity>().Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        _context.Set<TEntity>().Remove(entity);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}