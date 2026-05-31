import { BuildingIcon } from "./Icons";

interface HeaderProps {
  username: string;
  organizations: Record<string, string>;
  onLogout: () => void;
}

export function Header({ username, organizations, onLogout }: HeaderProps) {
  return (
    <header className="portal-header">
      <div className="brand-section">
        <div className="brand-info">
          <h1>Sagacity Solutions</h1>
          <p>Consulting Portal</p>
        </div>
      </div>

      <div className="user-profile-section">
        {Object.keys(organizations).map((orgId) => (
          <div className="org-indicator" key={orgId}>
            <BuildingIcon />
            {organizations[orgId]}
          </div>
        ))}
        <div className="user-badge">
          <span className="user-name">{username}</span>
        </div>
        <button type="button" className="btn-signout" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
