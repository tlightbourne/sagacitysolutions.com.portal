using MediatR;
using System.Security.Claims;
using sagacitysolutions.com.portal.Application.Features.Projects;

namespace sagacitysolutions.com.portal.WebApi.Routes;

public static class ProjectRoutes
{
    public static void MapProjectRoutes(this WebApplication app)
    {
        var group = app.MapGroup("/api/projects")
                       .RequireAuthorization()
                       .AddEndpointFilter(new ScopeAuthorizationFilter("read:projects"));

        group.MapGet("/", async (IMediator mediator, ClaimsPrincipal user) =>
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
    }
}