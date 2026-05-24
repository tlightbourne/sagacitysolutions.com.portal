using MediatR;
using sagacitysolutions.com.portal.Application.Features.Task;

namespace sagacitysolutions.com.portal.WebApi.Routes;
public static class TaskRoutes
{
    public static void MapTaskRoutes(this WebApplication app)
    {
        var group = app.MapGroup("/api/projects/{projectId:guid}/tasks");
        group.MapGet("/", async (Guid projectId, IMediator mediator) =>
        {
            var tasks = await mediator.Send(new GetProjectTasksRequest());
            return Results.Ok(tasks);
        });
    }
}