using MediatR;
using sagacitysolutions.com.portal.Application.Common.Messaging;
using sagacitysolutions.com.portal.Application.Features.Task.Queries;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task;

public record UpdateTaskRequest(
    Guid ProjectId,
    Guid Id,
    string Title,
    WorkTaskType Type,
    WorkTaskStatus Status,
    string? Description = null,
    byte? Hours = null
) : ICommand<WorkTask>;

public class UpdateTaskHandler : IRequestHandler<UpdateTaskRequest, WorkTask>
{
    private readonly IWriteRepository<WorkTask> _writeRepository;
    private readonly IReadOnlyRepository _readRepository;
    private readonly ITaskStatusPropagator _statusPropagator;

    public UpdateTaskHandler(IWriteRepository<WorkTask> writeRepository, IReadOnlyRepository readRepository, ITaskStatusPropagator statusPropagator)
    {
        _writeRepository = writeRepository ?? throw new ArgumentNullException(nameof(writeRepository));
        _readRepository = readRepository ?? throw new ArgumentNullException(nameof(readRepository));
        _statusPropagator = statusPropagator ?? throw new ArgumentNullException(nameof(statusPropagator));
    }

    public async System.Threading.Tasks.Task<WorkTask> Handle(UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        // Load task with children to verify if it is a leaf node
        var spec = new GetTaskWithChildrenSpecification(request.Id);
        var taskWithChildren = await _readRepository.FirstOrDefaultAsync(spec, cancellationToken);
        if (taskWithChildren == null)
        {
            throw new KeyNotFoundException($"Task not found with ID {request.Id}.");
        }

        // If it is a parent task, direct status updates are forbidden
        if (taskWithChildren.Children.Any() && taskWithChildren.Status != request.Status)
        {
            throw new ArgumentException("Parent task status cannot be modified directly. It must be determined by its child tasks.");
        }

        var task = await _writeRepository.GetByIdAsync(request.Id, cancellationToken);
        if (task == null)
        {
            throw new KeyNotFoundException($"Task not found with ID {request.Id}.");
        }

        task.Update(
            request.Title,
            request.Type,
            request.Description,
            request.Hours,
            request.Status
        );

        await _writeRepository.UpdateAsync(task, cancellationToken);
        await _writeRepository.SaveChangesAsync(cancellationToken);

        // Propagate status upwards recursively if it's a leaf task and status changed
        if (task.ParentId.HasValue && taskWithChildren.Status != request.Status)
        {
            await _statusPropagator.PropagateStatusUpwardsAsync(task.ParentId.Value, cancellationToken);
            await _writeRepository.SaveChangesAsync(cancellationToken);
        }

        return task;
    }
}
