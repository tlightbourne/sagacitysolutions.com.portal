using MediatR;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Projects;

public record DeleteProjectRequest(Guid ProjectId) : IRequest;

public class DeleteProjectHandler : IRequestHandler<DeleteProjectRequest>
{
    private readonly IWriteRepository<Project> _repository;

    public DeleteProjectHandler(IWriteRepository<Project> repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async System.Threading.Tasks.Task Handle(DeleteProjectRequest request, CancellationToken cancellationToken)
    {
        var project = await _repository.GetByIdAsync(request.ProjectId, cancellationToken);
        await _repository.DeleteAsync(project, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
    }
}
