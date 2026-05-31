using MediatR;
using sagacitysolutions.com.portal.Application.Common.Messaging;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Projects;

public record AddProjectRequest(string TenantId, string Name) : ICommand<Project>;

public class AddProjectHandler : IRequestHandler<AddProjectRequest, Project>
{
    private readonly IWriteRepository<Project> _repository;

    public AddProjectHandler(IWriteRepository<Project> repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Project> Handle(AddProjectRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.TenantId))
        {
            throw new ArgumentException("Tenant ID cannot be empty.", nameof(request.TenantId));
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Project name cannot be empty.", nameof(request.Name));
        }

        var project = new Project(request.TenantId, request.Name);
        await _repository.AddAsync(project, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return project;
    }
}
