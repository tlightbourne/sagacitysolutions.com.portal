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
}
