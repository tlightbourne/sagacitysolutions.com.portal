namespace sagacitysolutions.com.portal.Domain.Entities;

public class Project
{
    public Guid Id { get; private set; }
    public string TenantId { get; private set; }
    public string Name { get; private set; }
    public ProjectStatus Status { get; private set; }
    public uint Version { get; private set; }

#pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    public Project() { }
#pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
    public Project(string tenantId, string name, ProjectStatus status = ProjectStatus.Active)
    {
        TenantId = tenantId;
        Name = name;
        Status = status;
    }

    public void Update(string name, ProjectStatus status)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Project name cannot be empty.", nameof(name));
        }
        Name = name;
        Status = status;
    }
}