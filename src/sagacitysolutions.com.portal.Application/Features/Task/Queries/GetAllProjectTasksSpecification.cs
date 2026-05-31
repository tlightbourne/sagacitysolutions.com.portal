using sagacitysolutions.com.portal.Application.Repository.Specifications;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task.Queries;

public class GetAllProjectTasksSpecification : Specification<WorkTask>
{
    public GetAllProjectTasksSpecification()
        : base(task => task.Status != WorkTaskStatus.Archived)
    {
        AddInclude(task => task.Children);
    }
}
