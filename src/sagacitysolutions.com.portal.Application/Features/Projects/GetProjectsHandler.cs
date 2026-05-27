using MediatR;
using sagacitysolutions.com.portal.Application.Features.Projects.Queries;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Projects;

public record GetProjectsRequest(List<Guid> ProjectIds) : IRequest<IEnumerable<Project>>;

public class GetProjectsHandler : IRequestHandler<GetProjectsRequest, IEnumerable<Project>>
{
    private readonly IReadOnlyRepository _repository;

    public GetProjectsHandler(IReadOnlyRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public Task<IEnumerable<Project>> Handle(GetProjectsRequest request, CancellationToken cancellationToken)
    {
        var spec = new GetProjectsSpecification(request.ProjectIds);
        return _repository.ToListAsync(spec, cancellationToken);
    }
}
