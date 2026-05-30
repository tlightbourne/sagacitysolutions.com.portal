using System.Linq.Expressions;

namespace sagacitysolutions.com.portal.Application.Repository.Specifications;

public interface ISpecification<TEntity>
{
    Expression<Func<TEntity, bool>> Criterion { get; }
    ICollection<Expression<Func<TEntity, object>>> Includes { get; }
    ICollection<string> IncludeStrings { get; }
}

public abstract class Specification<TEntity> : ISpecification<TEntity>
{
    public Expression<Func<TEntity, bool>> Criterion { get; private set; }
    public ICollection<Expression<Func<TEntity, object>>> Includes { get; } = new List<Expression<Func<TEntity, object>>>();
    public ICollection<string> IncludeStrings { get; } = new List<string>();

    protected Specification(Expression<Func<TEntity, bool>> criterion)
    {
        Criterion = criterion;
    }

    protected void AddInclude(Expression<Func<TEntity, object>> includeExpression)
    {
        Includes.Add(includeExpression);
    }

    protected void AddInclude(string includeString)
    {
        IncludeStrings.Add(includeString);
    }
}