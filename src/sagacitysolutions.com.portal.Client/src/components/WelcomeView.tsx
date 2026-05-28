interface WelcomeViewProps {
  status: "loading" | "unauthenticated";
  onLogin: () => void;
}

export function WelcomeView({ status, onLogin }: WelcomeViewProps) {
  if (status === "loading") {
    return (
      <div className="welcome-container">
        <div className="welcome-glass-card">
          <div className="welcome-logo">S</div>
          <h2>Sagacity Solutions</h2>
          <p>Initializing secure consulting session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-container">
      <div className="welcome-glass-card">
        <div className="welcome-logo">S</div>
        <h2>Sagacity Solutions</h2>
        <p>
          Welcome to the project portal. Please sign in to securely view your
          consulting projects, timeline, and deliverables.
        </p>
        <button type="button" className="btn-signin" onClick={onLogin}>
          Secure Sign In
        </button>
      </div>
    </div>
  );
}
