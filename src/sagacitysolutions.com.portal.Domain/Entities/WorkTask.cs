namespace sagacitysolutions.com.portal.Domain.Entities;

public class WorkTask
{
    public Guid Id { get; private set; }
    public Guid ProjectId { get; private set; }
    public Guid? ParentId { get; private set; }
    public string Title { get; private set; }
    public string? Description { get; private set; }
    public WorkTaskType Type { get; private set; }
    public WorkTaskStatus Status { get; private set; }
    public byte? Hours { get; private set; }
    public byte Order { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    public ICollection<Attachment> Attachments { get; } = new List<Attachment>();
    [System.Text.Json.Serialization.JsonIgnore]
    public WorkTask? Parent { get; private set; }
    public ICollection<WorkTask> Children { get; } = new List<WorkTask>();
    public ICollection<TaskLink> TaskLinks { get; } = new List<TaskLink>();

#pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    private WorkTask() { }
#pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    [System.Text.Json.Serialization.JsonConstructor]
    public WorkTask(Guid id, Guid projectId, string title, WorkTaskType type, WorkTaskStatus status, byte order,
        Guid? parentId = null, string? description = null, byte? hours = null, DateTime? completedAt = null)
    {
        Id = id;
        ProjectId = projectId;
        ParentId = parentId;
        Title = title;
        Description = description;
        Type = type;
        Status = status;
        Hours = hours;
        Order = order;
        CompletedAt = completedAt;
    }

    public void Update(string title, WorkTaskType type, string? description, byte? hours, WorkTaskStatus status)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Task title cannot be empty.", nameof(title));
        }

        Title = title;
        Type = type;
        Description = description;
        Hours = hours;
        Status = status;

        if (status == WorkTaskStatus.Completed)
        {
            CompletedAt = DateTime.UtcNow;
        }
        else
        {
            CompletedAt = null;
        }
    }

    public void SetStatus(WorkTaskStatus status)
    {
        Status = status;
        if (status == WorkTaskStatus.Completed)
        {
            CompletedAt = DateTime.UtcNow;
        }
        else
        {
            CompletedAt = null;
        }
    }

    public WorkTaskStatus CalculateStatusFromChildren()
    {
        if (Children == null || !Children.Any()) return WorkTaskStatus.NotStarted;

        var statuses = Children.Select(c => c.Status).ToList();

        // 1. If all tasks are completed, parent task is also completed
        if (statuses.All(s => s == WorkTaskStatus.Completed))
        {
            return WorkTaskStatus.Completed;
        }

        // 2. If at least one child is in progress, the parent task is also in progress
        if (statuses.Any(s => s == WorkTaskStatus.InProgress))
        {
            return WorkTaskStatus.InProgress;
        }

        // 3. If some tasks are completed and the rest are not started, parent is in progress
        bool hasCompleted = statuses.Any(s => s == WorkTaskStatus.Completed);
        bool hasNotStarted = statuses.Any(s => s == WorkTaskStatus.NotStarted);
        bool onlyCompletedOrNotStarted = statuses.All(s => s == WorkTaskStatus.Completed || s == WorkTaskStatus.NotStarted);
        if (hasCompleted && hasNotStarted && onlyCompletedOrNotStarted)
        {
            return WorkTaskStatus.InProgress;
        }

        // 4. If all tasks are either not started or on hold, the parent is also on hold
        bool onlyNotStartedOrOnHold = statuses.All(s => s == WorkTaskStatus.NotStarted || s == WorkTaskStatus.OnHold);
        bool hasAnyOnHold = statuses.Any(s => s == WorkTaskStatus.OnHold);
        if (onlyNotStartedOrOnHold && hasAnyOnHold)
        {
            return WorkTaskStatus.OnHold;
        }

        // 5. If all children are not started, parent is not started
        if (statuses.All(s => s == WorkTaskStatus.NotStarted))
        {
            return WorkTaskStatus.NotStarted;
        }

        return WorkTaskStatus.InProgress;
    }
}
