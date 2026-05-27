using sagacitysolutions.com.portal.Application.Identity;

namespace sagacitysolutions.com.portal.WebApi;
public class RequestContext : IRequestContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public Guid? ProjectId
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext != null)
            {
                if (httpContext.Request.RouteValues.TryGetValue("projectId", out var val) &&
                    Guid.TryParse(val?.ToString(), out var projectId))
                {
                    return projectId;
                }
            }
            return null;
        }
    }

    public RequestContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
    }

    public string? GetClaimValue(string claimType)
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(claimType)?.Value;
    }

    public bool HasClaim(string claimType)
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(claimType) != null;
    }
}