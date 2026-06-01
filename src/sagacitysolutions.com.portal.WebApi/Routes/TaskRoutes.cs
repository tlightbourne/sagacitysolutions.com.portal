using MediatR;
using Microsoft.EntityFrameworkCore;
using sagacitysolutions.com.portal.Application.Features.Task;

namespace sagacitysolutions.com.portal.WebApi.Routes;
public static class TaskRoutes
{
    public static void MapTaskRoutes(this WebApplication app)
    {
        var group = app.MapGroup("/api/projects/{projectId:guid}/tasks")
                       .AddEndpointFilter<TaskAuthorizationFilter>();

        group.MapGet("", async (IMediator mediator) =>
        {
            var tasks = await mediator.Send(new GetProjectTasksRequest());
            return Results.Ok(tasks);
        });

        group.MapPost("", async (Guid projectId, AddTaskRequest request, IMediator mediator) =>
        {
            if (projectId != request.ProjectId)
            {
                return Results.BadRequest("Project ID mismatch.");
            }

            try
            {
                var task = await mediator.Send(request);
                return Results.Created($"/api/projects/{projectId}/tasks/{task.Id}", task);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapPut("/reorder", async (Guid projectId, ReorderTasksRequest request, IMediator mediator) =>
        {
            if (projectId != request.ProjectId)
            {
                return Results.BadRequest("Project ID mismatch.");
            }

            try
            {
                var tasks = await mediator.Send(request);
                return Results.Ok(tasks);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ex.Message);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Results.Conflict("The record was modified by another user. Please reload.");
            }
        });

        group.MapPut("/{taskId:guid}", async (Guid projectId, Guid taskId, UpdateTaskRequest request, IMediator mediator) =>
        {
            if (projectId != request.ProjectId)
            {
                return Results.BadRequest("Project ID mismatch.");
            }
            if (taskId != request.Id)
            {
                return Results.BadRequest("Task ID mismatch.");
            }

            try
            {
                var task = await mediator.Send(request);
                return Results.Ok(task);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ex.Message);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Results.Conflict("The record was modified by another user. Please reload.");
            }
        });

        group.MapDelete("/{taskId:guid}", async (Guid projectId, Guid taskId, IMediator mediator) =>
        {
            try
            {
                await mediator.Send(new DeleteTaskRequest(projectId, taskId));
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ex.Message);
            }
        });
    }
}