using MediatR;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task;

public record AddTaskRequest(
    Guid? Id,
    Guid ProjectId,
    string Title,
    WorkTaskType Type,
    Guid? ParentId = null,
    string? Description = null,
    byte? Hours = null,
    WorkTaskStatus Status = WorkTaskStatus.NotStarted
) : IRequest<WorkTask>;

public class AddTaskHandler : IRequestHandler<AddTaskRequest, WorkTask>
{
    private readonly IWriteRepository<WorkTask> _repository;
    private readonly ITaskStatusPropagator _statusPropagator;

    public AddTaskHandler(IWriteRepository<WorkTask> repository, ITaskStatusPropagator statusPropagator)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _statusPropagator = statusPropagator ?? throw new ArgumentNullException(nameof(statusPropagator));
    }

    public async System.Threading.Tasks.Task<WorkTask> Handle(AddTaskRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("Task title cannot be empty.", nameof(request.Title));
        }

        if (request.ParentId.HasValue)
        {
            // Verify parent task exists and check nesting depth
            var parent = await _repository.GetByIdAsync(request.ParentId.Value, cancellationToken);
            if (parent == null)
            {
                throw new ArgumentException("Parent task not found.", nameof(request.ParentId));
            }

            if (parent.ParentId.HasValue)
            {
                // Parent is at level 1 (subtask). Check if parent's parent has a parent.
                var grandParent = await _repository.GetByIdAsync(parent.ParentId.Value, cancellationToken);
                if (grandParent != null && grandParent.ParentId.HasValue)
                {
                    throw new ArgumentException("Nesting level cannot exceed 2 levels.");
                }
            }
        }

        // Determine ordering within parent context
        byte order = 1;
        // In a full implementation, we could count existing tasks in the parent context.
        // For simplicity, starting at 1 or counting is fine.

        var taskId = request.Id ?? Guid.NewGuid();
        var task = new WorkTask(
            taskId,
            request.ProjectId,
            request.Title,
            request.Type,
            request.Status,
            order,
            request.ParentId,
            request.Description,
            request.Hours
        );

        await _repository.AddAsync(task, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (request.ParentId.HasValue)
        {
            await _statusPropagator.PropagateStatusUpwardsAsync(request.ParentId.Value, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);
        }

        return task;
    }
}
