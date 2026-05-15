export default function LoginPage() {
  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">Auth</p>
          <h1>Login</h1>
          <p className="muted">
            Placeholder screen for the authenticated Bitacora MVP session.
          </p>
        </div>
      </div>

      <form className="panel form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="admin@bitacora.local" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Password" />
        </div>
        <button type="button">Sign in</button>
      </form>
    </section>
  );
}
