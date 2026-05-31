using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;
using sagacitysolutions.com.portal.Application.Identity;
using sagacitysolutions.com.portal.Domain.Entities;

namespace sagacitysolutions.com.portal.Infrastructure.Data;

public class PortalDbContext : DbContext
{
    private readonly IRequestContext _requestContext;
    private readonly string[] _authorizedTenantIds;

    public PortalDbContext(DbContextOptions<PortalDbContext> options, IRequestContext requestContext)
    : base(options)
    {
        _requestContext = requestContext;
        _authorizedTenantIds = _requestContext.GetClaimValue("authorized_tenants")?
            .Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .ToArray() ?? Array.Empty<string>();
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasQueryFilter(e => _authorizedTenantIds.Contains(e.TenantId));
            entity.Property(e => e.Id)
                  .ValueGeneratedOnAdd()
                  .HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
        });

        modelBuilder.Entity<WorkTask>(entity =>
        {
            entity.HasQueryFilter(e => e.ProjectId == _requestContext.ProjectId);
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.Title).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(50);
            entity.HasOne<Project>()
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Children)
                  .WithOne(e => e.Parent)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(e => e.Attachments)
                  .WithOne(e => e.Task)
                  .HasForeignKey(e => e.TaskId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.TaskLinks)
                  .WithOne(e => e.Task)
                  .HasForeignKey(e => e.TaskId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Attachment>(entity =>
        {
            entity.HasQueryFilter(e => e.Task.ProjectId == _requestContext.ProjectId);
            entity.Property(e => e.Id)
                  .ValueGeneratedOnAdd()
                  .HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            entity.Property(e => e.Url).HasMaxLength(2000);
        });

        modelBuilder.Entity<TaskLink>(entity =>
        {
            entity.HasKey(e => new { e.TaskId, e.LinkedTaskId });
            entity.HasQueryFilter(e => e.Task.ProjectId == _requestContext.ProjectId);
            entity.Property(e => e.LinkType).HasConversion<string>().HasMaxLength(50);
            entity.HasOne<WorkTask>()
                  .WithMany()
                  .HasForeignKey(e => e.LinkedTaskId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}