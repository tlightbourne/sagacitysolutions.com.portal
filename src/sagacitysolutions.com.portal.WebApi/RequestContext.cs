using sagacitysolutions.com.portal.Application.Identity;

namespace sagacitysolutions.com.portal.WebApi;
public class RequestContext : IRequestContext
{
    private IHttpContextAccessor _httpContextAccessor;

    public Guid? ProjectId { get; set; }

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