using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace sagacitysolutions.com.portal.WebApi;

public class ProjectAccessRequirement : IAuthorizationRequirement
{
    public string Scope { get; }
    public Guid ProjectId { get; }

    public ProjectAccessRequirement(string scope, Guid projectId)
    {
        Scope = scope;
        ProjectId = projectId;
    }
}

public class ProjectAccessHandler : AuthorizationHandler<ProjectAccessRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ProjectAccessRequirement requirement)
    {
        var user = context.User;

        // 1. Check if the scope claim has the required scope (read or write)
        var scopes = user.FindFirst("scope")?.Value?.Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries)
                     ?? Array.Empty<string>();

        bool hasScope = scopes.Contains(requirement.Scope, StringComparer.OrdinalIgnoreCase);

        // 2. Check if the portal_project_ids claim contains the requested projectId
        var projectIds = user.FindAll("portal_project_ids")
                            .SelectMany(c => c.Value.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries))
                            .Select(Guid.Parse)
                            .ToList();

        bool hasProject = projectIds.Contains(requirement.ProjectId);

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
        // Format: "read:project-guid" or "write:project-guid"
        var parts = policyName.Split(':');
        if (parts.Length == 2 && (parts[0].Equals("read", StringComparison.OrdinalIgnoreCase) || parts[0].Equals("write", StringComparison.OrdinalIgnoreCase)))
        {
            var scope = parts[0];
            var target = parts[1]; // e.g. "project-11111111-..."
            if (target.StartsWith("project-", StringComparison.OrdinalIgnoreCase))
            {
                var projectIdStr = target.Substring("project-".Length);
                if (Guid.TryParse(projectIdStr, out var projectId))
                {
                    var policy = new AuthorizationPolicyBuilder()
                        .AddAuthenticationSchemes("Bearer")
                        .RequireAuthenticatedUser()
                        .AddRequirements(new ProjectAccessRequirement(scope, projectId))
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
