export function AppShell({ sidebar, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      <div className="main-col">{children}</div>
    </div>
  );
}
