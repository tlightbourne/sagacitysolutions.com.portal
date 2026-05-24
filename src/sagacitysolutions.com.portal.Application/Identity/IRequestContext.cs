namespace sagacitysolutions.com.portal.Application.Identity;

public interface IRequestContext
{
    Guid? ProjectId { get; }
    bool HasClaim(string claimType);
    string? GetClaimValue(string claimType);
}