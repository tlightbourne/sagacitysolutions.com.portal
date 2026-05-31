using MediatR;
using sagacitysolutions.com.portal.Application.Features.Task.Queries;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace sagacitysolutions.com.portal.Application.Features.Task;

public record ReorderTasksRequest(
    Guid ProjectId,
    Guid TaskId,
    WorkTaskStatus NewStatus,
    byte NewOrder
) : IRequest<IEnumerable<WorkTask>>;

public class ReorderTasksHandler : IRequestHandler<ReorderTasksRequest, IEnumerable<WorkTask>>
{
    private readonly IWriteRepository<WorkTask> _writeRepository;
    private readonly IReadOnlyRepository _readRepository;
    private readonly ITaskStatusPropagator _statusPropagator;

    public ReorderTasksHandler(
        IWriteRepository<WorkTask> writeRepository,
        IReadOnlyRepository readRepository,
        ITaskStatusPropagator statusPropagator)
    {
        _writeRepository = writeRepository ?? throw new ArgumentNullException(nameof(writeRepository));
        _readRepository = readRepository ?? throw new ArgumentNullException(nameof(readRepository));
        _statusPropagator = statusPropagator ?? throw new ArgumentNullException(nameof(statusPropagator));
    }

    public async Task<IEnumerable<WorkTask>> Handle(ReorderTasksRequest request, CancellationToken cancellationToken)
    {
        // 1. Load project tasks using the standard spec to perform leaf validation and traversal
        var spec = new GetProjectTasksSpecification();
        var topLevelTasks = (await _readRepository.ToListAsync(spec, cancellationToken)).ToList();

        // 2. Find target task in the hierarchical tree
        var targetTaskReadOnly = FindTaskInTree(topLevelTasks, request.TaskId);
        if (targetTaskReadOnly == null)
        {
            throw new KeyNotFoundException($"Task not found with ID {request.TaskId}.");
        }

        // 3. Verify it is a leaf task
        if (targetTaskReadOnly.Children != null && targetTaskReadOnly.Children.Any())
        {
            throw new ArgumentException("Parent task status and ordering cannot be modified directly. It must be determined by its child tasks.");
        }

        // 4. Collect all leaf tasks in the project tree
        var leafTasks = new List<WorkTask>();
        CollectLeafTasks(topLevelTasks, leafTasks);

        var oldStatus = targetTaskReadOnly.Status;
        var newStatus = request.NewStatus;
        bool statusChanged = oldStatus != newStatus;

        // 5. Re-sequence columns consecutively
        var statusesToProcess = new[] { WorkTaskStatus.NotStarted, WorkTaskStatus.InProgress, WorkTaskStatus.OnHold, WorkTaskStatus.Completed };

        foreach (var status in statusesToProcess)
        {
            var columnTasks = leafTasks
                .Where(t => t.Status == status)
                .OrderBy(t => t.Order)
                .ThenBy(t => t.Id)
                .ToList();

            if (status == oldStatus && !statusChanged)
            {
                // Reordering within the same column
                var targetIdx = columnTasks.FindIndex(t => t.Id == request.TaskId);
                if (targetIdx >= 0)
                {
                    var target = columnTasks[targetIdx];
                    columnTasks.RemoveAt(targetIdx);
                    int insertPos = Math.Clamp(request.NewOrder - 1, 0, columnTasks.Count);
                    columnTasks.Insert(insertPos, target);
                }
            }
            else if (status == oldStatus && statusChanged)
            {
                // Remove from old column
                columnTasks.RemoveAll(t => t.Id == request.TaskId);
            }
            else if (status == newStatus && statusChanged)
            {
                // Insert into new column at requested position
                int insertPos = Math.Clamp(request.NewOrder - 1, 0, columnTasks.Count);
                columnTasks.Insert(insertPos, targetTaskReadOnly);
            }

            // Apply consecutive ordering starting from 1
            for (int i = 0; i < columnTasks.Count; i++)
            {
                byte expectedOrder = (byte)(i + 1);
                var currentTask = columnTasks[i];

                var writeEntity = await _writeRepository.GetByIdAsync(currentTask.Id, cancellationToken);
                if (writeEntity != null)
                {
                    bool isTarget = currentTask.Id == request.TaskId;
                    bool modified = false;

                    if (isTarget && statusChanged)
                    {
                        writeEntity.SetStatus(newStatus);
                        modified = true;
                    }

                    if (writeEntity.Order != expectedOrder)
                    {
                        writeEntity.SetOrder(expectedOrder);
                        modified = true;
                    }

                    if (modified)
                    {
                        await _writeRepository.UpdateAsync(writeEntity, cancellationToken);
                    }
                }
            }
        }

        // 6. Save reordered tasks
        await _writeRepository.SaveChangesAsync(cancellationToken);

        // 7. If status changed, run recursive upwards status propagation for parent WBS nodes
        if (statusChanged && targetTaskReadOnly.ParentId.HasValue)
        {
            await _statusPropagator.PropagateStatusUpwardsAsync(targetTaskReadOnly.ParentId.Value, cancellationToken);
            await _writeRepository.SaveChangesAsync(cancellationToken);
        }

        // 8. Re-fetch and return the updated hierarchy to keep client fully in sync in one update
        var updatedTopLevelTasks = await _readRepository.ToListAsync(new GetProjectTasksSpecification(), cancellationToken);
        return updatedTopLevelTasks.Where(t => t.ParentId == null).ToList();
    }

    private WorkTask? FindTaskInTree(IEnumerable<WorkTask> tasks, Guid taskId)
    {
        foreach (var task in tasks)
        {
            if (task.Id == taskId) return task;
            var found = FindTaskInTree(task.Children, taskId);
            if (found != null) return found;
        }
        return null;
    }

    private void CollectLeafTasks(IEnumerable<WorkTask> tasks, List<WorkTask> leafTasks)
    {
        foreach (var task in tasks)
        {
            if (task.Children == null || !task.Children.Any())
            {
                leafTasks.Add(task);
            }
            else
            {
                CollectLeafTasks(task.Children, leafTasks);
            }
        }
    }
}
