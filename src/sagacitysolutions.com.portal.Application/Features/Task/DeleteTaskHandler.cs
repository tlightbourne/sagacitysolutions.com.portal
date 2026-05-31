using MediatR;
using sagacitysolutions.com.portal.Application.Common.Messaging;
using sagacitysolutions.com.portal.Application.Features.Task.Queries;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task;

public record DeleteTaskRequest(Guid ProjectId, Guid Id) : ICommand;

public class DeleteTaskHandler : IRequestHandler<DeleteTaskRequest>
{
    private readonly IWriteRepository<WorkTask> _writeRepository;
    private readonly IReadOnlyRepository _readRepository;
    private readonly ITaskStatusPropagator _statusPropagator;

    public DeleteTaskHandler(IWriteRepository<WorkTask> writeRepository, IReadOnlyRepository readRepository, ITaskStatusPropagator statusPropagator)
    {
        _writeRepository = writeRepository ?? throw new ArgumentNullException(nameof(writeRepository));
        _readRepository = readRepository ?? throw new ArgumentNullException(nameof(readRepository));
        _statusPropagator = statusPropagator ?? throw new ArgumentNullException(nameof(statusPropagator));
    }

    public async System.Threading.Tasks.Task Handle(DeleteTaskRequest request, CancellationToken cancellationToken)
    {
        // Fetch task to check if it exists and find its parent ID
        var task = await _writeRepository.GetByIdAsync(request.Id, cancellationToken);
        if (task == null)
        {
            throw new KeyNotFoundException($"Task not found with ID {request.Id}.");
        }

        var parentId = task.ParentId;

        // Perform recursive cascade delete of the task and all children
        await DeleteTaskAndChildrenRecursivelyAsync(request.Id, cancellationToken);
        await _writeRepository.SaveChangesAsync(cancellationToken);

        // Recalculate status of parent tasks if we just deleted a child task
        if (parentId.HasValue)
        {
            await _statusPropagator.PropagateStatusUpwardsAsync(parentId.Value, cancellationToken);
            await _writeRepository.SaveChangesAsync(cancellationToken);
        }
    }

    private async System.Threading.Tasks.Task DeleteTaskAndChildrenRecursivelyAsync(Guid taskId, CancellationToken cancellationToken)
    {
        var spec = new GetTaskWithChildrenSpecification(taskId);
        var task = await _readRepository.FirstOrDefaultAsync(spec, cancellationToken);
        if (task == null) return;

        // Cascade delete children
        foreach (var child in task.Children)
        {
            await DeleteTaskAndChildrenRecursivelyAsync(child.Id, cancellationToken);
        }

        // Delete parent task
        var writeTask = await _writeRepository.GetByIdAsync(taskId, cancellationToken);
        if (writeTask != null)
        {
            await _writeRepository.DeleteAsync(writeTask, cancellationToken);
        }
    }
}
