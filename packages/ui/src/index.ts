// Shared UI components
// Export reusable React components here

import React from "react";

// Example component - replace with your actual components
export const Button: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <button>{children || "Click me"}</button>;
};

