using sagacitysolutions.com.portal.Application.Repository.Specifications;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task.Queries;

public class GetProjectTasksSpecification : Specification<WorkTask>
{
    public GetProjectTasksSpecification():
        base(task =>
            task.Status != WorkTaskStatus.Archived &&
            task.ParentId == null)
    {
        AddInclude("Children");
        AddInclude("Children.Children");
    }
}