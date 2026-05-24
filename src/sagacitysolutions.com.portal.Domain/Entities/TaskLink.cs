namespace sagacitysolutions.com.portal.Domain.Entities;

public class TaskLink
{
    public Guid TaskId { get; private set; }
    public Guid LinkedTaskId { get; private set; }
    public TaskLinkType LinkType { get; private set; }

    public WorkTask Task { get; private set; }

#pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    public TaskLink() {}

    public TaskLink(Guid taskId, Guid linkedTaskId, TaskLinkType linkType)
#pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    {
        TaskId = taskId;
        LinkedTaskId = linkedTaskId;
        LinkType = linkType;
    }
}