namespace sagacitysolutions.com.portal.Domain.Entities;

public class Attachment
{
    public Guid Id { get; private set; }
    public Guid TaskId { get; private set; }
    public string Url { get; private set; }

    public WorkTask Task { get; private set; }

#pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    private Attachment() { }
    public Attachment(Guid taskId, string url)
#pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    {
        TaskId = taskId;
        Url = url;
    }
}