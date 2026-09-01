import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGate } from "./pages/AuthGate";
import { Layout } from "./pages/Layout";
import { ProjectPage } from "./pages/ProjectPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}
