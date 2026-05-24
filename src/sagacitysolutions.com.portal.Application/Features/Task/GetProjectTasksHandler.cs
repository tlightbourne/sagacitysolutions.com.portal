using MediatR;
using sagacitysolutions.com.portal.Application.Features.Task.Queries;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task;

public record GetProjectTasksRequest : IRequest<IEnumerable<WorkTask>>;
public class GetProjectTasksHandler : IRequestHandler<GetProjectTasksRequest, IEnumerable<WorkTask>>
{
    private readonly IReadOnlyRepository _repository;

    public GetProjectTasksHandler(IReadOnlyRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IEnumerable<WorkTask>> Handle(GetProjectTasksRequest request, CancellationToken cancellationToken)
    {
        return _repository.ToListAsync(new GetProjectTasksSpecification(), cancellationToken);
    }
}