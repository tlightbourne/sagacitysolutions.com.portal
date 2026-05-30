using sagacitysolutions.com.portal.Application.Features.Task.Queries;
using sagacitysolutions.com.portal.Application.Repository;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Application.Features.Task;

public interface ITaskStatusPropagator
{
    System.Threading.Tasks.Task PropagateStatusUpwardsAsync(Guid parentId, CancellationToken cancellationToken);
}

public class TaskStatusPropagator : ITaskStatusPropagator
{
    private readonly IWriteRepository<WorkTask> _writeRepository;
    private readonly IReadOnlyRepository _readRepository;

    public TaskStatusPropagator(IWriteRepository<WorkTask> writeRepository, IReadOnlyRepository readRepository)
    {
        _writeRepository = writeRepository ?? throw new ArgumentNullException(nameof(writeRepository));
        _readRepository = readRepository ?? throw new ArgumentNullException(nameof(readRepository));
    }

    public async System.Threading.Tasks.Task PropagateStatusUpwardsAsync(Guid parentId, CancellationToken cancellationToken)
    {
        var parentSpec = new GetTaskWithChildrenSpecification(parentId);
        var parent = await _readRepository.FirstOrDefaultAsync(parentSpec, cancellationToken);
        if (parent == null) return;

        var newStatus = parent.CalculateStatusFromChildren();

        var parentWrite = await _writeRepository.GetByIdAsync(parentId, cancellationToken);
        if (parentWrite != null && parentWrite.Status != newStatus)
        {
            parentWrite.SetStatus(newStatus);
            await _writeRepository.UpdateAsync(parentWrite, cancellationToken);
        }

        if (parent.ParentId.HasValue)
        {
            await PropagateStatusUpwardsAsync(parent.ParentId.Value, cancellationToken);
        }
    }
}
