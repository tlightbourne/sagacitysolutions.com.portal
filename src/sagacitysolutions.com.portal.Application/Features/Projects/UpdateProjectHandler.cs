using MediatR;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Projects;

public record UpdateProjectRequest(Guid ProjectId, string Name, ProjectStatus Status) : IRequest<Project>;

public class UpdateProjectHandler : IRequestHandler<UpdateProjectRequest, Project>
{
    private readonly IWriteRepository<Project> _repository;

    public UpdateProjectHandler(IWriteRepository<Project> repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Project> Handle(UpdateProjectRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Project name cannot be empty.", nameof(request.Name));
        }

        var project = await _repository.GetByIdAsync(request.ProjectId, cancellationToken);
        project.Update(request.Name, request.Status);
        
        await _repository.UpdateAsync(project, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        
        return project;
    }
}
