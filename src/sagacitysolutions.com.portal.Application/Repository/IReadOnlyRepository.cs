using sagacitysolutions.com.portal.Application.Repository.Specifications;

namespace sagacitysolutions.com.portal.Application.Repository;

public interface IReadOnlyRepository
{
    Task<IEnumerable<TEntity>> ToListAsync<TEntity>(
        ISpecification<TEntity> specification,
        CancellationToken cancellationToken = default)
        where TEntity : class;
    Task<TEntity?> FirstOrDefaultAsync<TEntity>(
        ISpecification<TEntity> specification,
        CancellationToken cancellationToken = default)
        where TEntity : class;
}