using sagacitysolutions.com.portal.Application.Repository.Specifications;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task.Queries;

public class GetTaskWithChildrenSpecification : Specification<WorkTask>
{
    public GetTaskWithChildrenSpecification(Guid taskId)
        : base(task => task.Id == taskId)
    {
        AddInclude(task => task.Children);
    }
}
