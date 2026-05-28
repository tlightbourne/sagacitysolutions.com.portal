using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace sagacitysolutions.com.portal.WebApi;

public class ProjectAccessRequirement : IAuthorizationRequirement
{
    public string Scope { get; }
    public Guid ProjectId { get; }
    public string ResourceType { get; }

    public ProjectAccessRequirement(string scope, Guid projectId, string resourceType = "projects")
    {
        Scope = scope;
        ProjectId = projectId;
        ResourceType = resourceType;
    }
}

public class ProjectAccessHandler : AuthorizationHandler<ProjectAccessRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ProjectAccessRequirement requirement)
    {
        var user = context.User;

        // 1. Check if the scope claim has the required scope (e.g. read:projects, write:tasks)
        var scopes = user.FindFirst("scope")?.Value?.Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries)
                     ?? Array.Empty<string>();

        string targetScope = $"{requirement.Scope}:{requirement.ResourceType}";
        bool hasScope = scopes.Contains(targetScope, StringComparer.OrdinalIgnoreCase);

        // 2. Check if the portal_project_ids claim contains the requested projectId or "*"
        var rawProjectIds = user.FindAll("portal_project_ids")
                            .SelectMany(c => c.Value.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries))
                            .ToList();

        bool hasProject = rawProjectIds.Contains("*") ||
                          rawProjectIds.Any(idStr => Guid.TryParse(idStr, out var id) && id == requirement.ProjectId);

        if (hasScope && hasProject)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public class ProjectAuthorizationPolicyProvider : IAuthorizationPolicyProvider
{
    public DefaultAuthorizationPolicyProvider FallbackPolicyProvider { get; }

    public ProjectAuthorizationPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        FallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        // Format: "read:project-guid", "write:project-guid", "read:task-project-guid", "write:task-project-guid"
        var parts = policyName.Split(':');
        if (parts.Length == 2 && (parts[0].Equals("read", StringComparison.OrdinalIgnoreCase) || parts[0].Equals("write", StringComparison.OrdinalIgnoreCase)))
        {
            var scope = parts[0];
            var target = parts[1];
            
            if (target.StartsWith("project-", StringComparison.OrdinalIgnoreCase))
            {
                var projectIdStr = target.Substring("project-".Length);
                if (Guid.TryParse(projectIdStr, out var projectId))
                {
                    var policy = new AuthorizationPolicyBuilder()
                        .AddAuthenticationSchemes("Bearer")
                        .RequireAuthenticatedUser()
                        .AddRequirements(new ProjectAccessRequirement(scope, projectId, "projects"))
                        .Build();

                    return Task.FromResult<AuthorizationPolicy?>(policy);
                }
            }
            else if (target.StartsWith("task-project-", StringComparison.OrdinalIgnoreCase))
            {
                var projectIdStr = target.Substring("task-project-".Length);
                if (Guid.TryParse(projectIdStr, out var projectId))
                {
                    var policy = new AuthorizationPolicyBuilder()
                        .AddAuthenticationSchemes("Bearer")
                        .RequireAuthenticatedUser()
                        .AddRequirements(new ProjectAccessRequirement(scope, projectId, "tasks"))
                        .Build();

                    return Task.FromResult<AuthorizationPolicy?>(policy);
                }
            }
        }

        return FallbackPolicyProvider.GetPolicyAsync(policyName);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => FallbackPolicyProvider.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => FallbackPolicyProvider.GetFallbackPolicyAsync();
}

public class ProjectAuthorizationFilter : IEndpointFilter
{
    private readonly IAuthorizationService _authorizationService;

    public ProjectAuthorizationFilter(IAuthorizationService authorizationService)
    {
        _authorizationService = authorizationService;
    }

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        var user = httpContext.User;

        // 1. Extract projectId from route values
        if (!httpContext.Request.RouteValues.TryGetValue("projectId", out var projectIdVal) ||
            !Guid.TryParse(projectIdVal?.ToString(), out var projectId))
        {
            // If there's no projectId parameter in the route, proceed
            return await next(context);
        }

        // 2. Determine required scope based on HTTP method (non-mutating vs mutating)
        var method = httpContext.Request.Method;
        var requiredScope = HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method)
            ? "read"
            : "write";

        // 3. Evaluate dynamic authorization policy
        var policyName = $"{requiredScope}:project-{projectId}";
        var authResult = await _authorizationService.AuthorizeAsync(user, null, policyName);

        if (!authResult.Succeeded)
        {
            return Results.Forbid();
        }

        return await next(context);
    }
}

public class TaskAuthorizationFilter : IEndpointFilter
{
    private readonly IAuthorizationService _authorizationService;

    public TaskAuthorizationFilter(IAuthorizationService authorizationService)
    {
        _authorizationService = authorizationService;
    }

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        var user = httpContext.User;

        // 1. Extract projectId from route values
        if (!httpContext.Request.RouteValues.TryGetValue("projectId", out var projectIdVal) ||
            !Guid.TryParse(projectIdVal?.ToString(), out var projectId))
        {
            // If there's no projectId parameter in the route, proceed
            return await next(context);
        }

        // 2. Determine required scope based on HTTP method (non-mutating vs mutating)
        var method = httpContext.Request.Method;
        var requiredScope = HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method)
            ? "read"
            : "write";

        // 3. Evaluate dynamic authorization policy
        var policyName = $"{requiredScope}:task-project-{projectId}";
        var authResult = await _authorizationService.AuthorizeAsync(user, null, policyName);

        if (!authResult.Succeeded)
        {
            return Results.Forbid();
        }

        return await next(context);
    }
}

public class ScopeAuthorizationFilter : IEndpointFilter
{
    private readonly string _requiredScope;

    public ScopeAuthorizationFilter(string requiredScope)
    {
        _requiredScope = requiredScope;
    }

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var user = context.HttpContext.User;
        var scopes = user.FindFirst("scope")?.Value?.Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries)
                     ?? Array.Empty<string>();

        if (!scopes.Contains(_requiredScope, StringComparer.OrdinalIgnoreCase))
        {
            return Results.Forbid();
        }

        return await next(context);
    }
}

