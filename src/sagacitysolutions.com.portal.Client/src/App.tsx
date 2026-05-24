import { useAuth } from "./useAuth";
import { login, logout } from "./api";
import "./App.css";

function App() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <div className="auth-container">
        <p>Loading…</p>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <div className="auth-container">
        <h1>Demo App</h1>
        <p>You are not signed in.</p>
        <button type="button" onClick={login}>
          Sign in with Logto
        </button>
      </div>
    );
  }

  const { user } = auth;

  return (
    <div className="auth-container">
      <h1>Demo App</h1>
      {user.picture && (
        <img src={user.picture} alt="avatar" className="avatar" />
      )}
      <p>
        Signed in as{" "}
        <strong>{user.name ?? user.username ?? user.email ?? user.sub}</strong>
      </p>
      {user.email && <p className="muted">{user.email}</p>}
      <button type="button" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}

export default App;
