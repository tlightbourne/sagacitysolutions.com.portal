using MediatR;
using System.Security.Claims;
using sagacitysolutions.com.portal.Application.Features.Projects;

namespace sagacitysolutions.com.portal.WebApi.Routes;

public static class ProjectRoutes
{
    public static void MapProjectRoutes(this WebApplication app)
    {
        app.MapGet("/api/projects", async (IMediator mediator, ClaimsPrincipal user) =>
        {
            var projectIds = user.FindAll("portal_project_ids")
                .SelectMany(c => c.Value.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries))
                .Select(Guid.Parse)
                .ToList();

            var projects = await mediator.Send(new GetProjectsRequest(projectIds));
            return Results.Ok(projects);
        }).RequireAuthorization();
    }
}