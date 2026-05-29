using MediatR;
using System.Security.Claims;
using sagacitysolutions.com.portal.Application.Features.Projects;

namespace sagacitysolutions.com.portal.WebApi.Routes;

public static class ProjectRoutes
{
    public static void MapProjectRoutes(this WebApplication app)
    {
        var readGroup = app.MapGroup("/api/projects")
                           .RequireAuthorization()
                           .AddEndpointFilter(new ScopeAuthorizationFilter("read:projects"));

        readGroup.MapGet("/", async (IMediator mediator, ClaimsPrincipal user) =>
        {
            var portalProjectIds = user.FindAll("portal_project_ids")
                .SelectMany(c => c.Value.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries))
                .ToList();

            List<Guid>? projectIds = null;
            if (!portalProjectIds.Contains("*"))
            {
                projectIds = portalProjectIds
                    .Select(idStr => Guid.TryParse(idStr, out var id) ? id : Guid.Empty)
                    .Where(id => id != Guid.Empty)
                    .ToList();
            }

            var projects = await mediator.Send(new GetProjectsRequest(projectIds));
            return Results.Ok(projects);
        });

        var createGroup = app.MapGroup("/api/projects")
                             .RequireAuthorization()
                             .AddEndpointFilter(new ScopeAuthorizationFilter("write:projects"));

        createGroup.MapPost("/", async (AddProjectRequest request, IMediator mediator) =>
        {
            try
            {
                var project = await mediator.Send(request);
                return Results.Created($"/api/projects/{project.Id}", project);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        var modifyGroup = app.MapGroup("/api/projects/{projectId:guid}")
                             .RequireAuthorization()
                             .AddEndpointFilter<ProjectAuthorizationFilter>();

        modifyGroup.MapPut("/", async (Guid projectId, UpdateProjectRequest request, IMediator mediator) =>
        {
            if (projectId != request.ProjectId)
            {
                return Results.BadRequest("Project ID mismatch.");
            }

            try
            {
                var project = await mediator.Send(request);
                return Results.Ok(project);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(ex.Message);
            }
        });

        modifyGroup.MapDelete("/", async (Guid projectId, IMediator mediator) =>
        {
            try
            {
                await mediator.Send(new DeleteProjectRequest(projectId));
                return Results.NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(ex.Message);
            }
        });
    }
}