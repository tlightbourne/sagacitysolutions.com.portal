interface HeaderProps {
  username: string;
  organizations: Record<string, string>;
  onLogout: () => void;
}

export function Header({ username, organizations, onLogout }: HeaderProps) {
  return (
    <header className="portal-header">
      <div className="brand-section">
        <div className="logo-icon">S</div>
        <div className="brand-info">
          <h1>Sagacity Solutions</h1>
          <p>Consulting Portal</p>
        </div>
      </div>

      <div className="user-profile-section">
        {Object.keys(organizations).map((orgId) => (
          <div className="org-indicator" key={orgId}>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {organizations[orgId]}
          </div>
        ))}
        <div className="user-badge">
          <span className="user-name">{username}</span>
          <div className="user-avatar">
            {username.substring(0, 2).toUpperCase()}
          </div>
        </div>
        <button type="button" className="btn-signout" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
