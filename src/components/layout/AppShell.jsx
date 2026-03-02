import React, { useState } from 'react';

export function AppShell({ sidebar, children }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  // Safely clone the sidebar element to pass the expansion state and toggle function
  const sidebarWithProps = React.isValidElement(sidebar)
    ? React.cloneElement(sidebar, { isExpanded, onToggle: toggleSidebar })
    : sidebar;

  return (
    <div className={`app-shell ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {sidebarWithProps}
      </aside>
      <div className="main-col">{children}</div>
    </div>
  );
}
