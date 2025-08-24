import React from "react";
import { Analytics } from "@vercel/analytics/react";
import UnionDashboard from "./UnionDashboard";

function App() {
  return (
    <div>
      <UnionDashboard />
      {process.env.NODE_ENV === "production" && <Analytics />}
    </div>
  );
}

export default App;
