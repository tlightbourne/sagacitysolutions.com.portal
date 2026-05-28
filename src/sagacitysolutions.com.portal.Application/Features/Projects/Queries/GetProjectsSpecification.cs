using sagacitysolutions.com.portal.Application.Repository.Specifications;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Projects.Queries;

public class GetProjectsSpecification : Specification<Project>
{
    public GetProjectsSpecification(List<Guid>? projectIds)
        : base(project => projectIds == null || projectIds.Contains(project.Id))
    {
    }
}
