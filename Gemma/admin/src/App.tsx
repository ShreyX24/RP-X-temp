import { Routes, Route, NavLink } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Games } from './pages/Games';
import { Runs } from './pages/Runs';
import { Queue } from './pages/Queue';
import { WorkflowBuilder } from './pages/WorkflowBuilder';
import { Settings } from './pages/Settings';

function App() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <NavLink to="/" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <span className="font-bold text-lg text-white">Gemma</span>
              </NavLink>
              <span className="text-xs text-gray-500 hidden sm:block">Control Center</span>
            </div>

            <nav className="flex items-center gap-1">
              <NavLink to="/" className={navLinkClass} end>
                Dashboard
              </NavLink>
              <NavLink to="/devices" className={navLinkClass}>
                SUTs
              </NavLink>
              <NavLink to="/games" className={navLinkClass}>
                Games
              </NavLink>
              <NavLink to="/runs" className={navLinkClass}>
                Runs
              </NavLink>
              <NavLink to="/queue" className={navLinkClass}>
                Queue
              </NavLink>
              <NavLink
                to="/workflow"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-400 hover:bg-purple-900/50 hover:text-purple-300'
                  }`
                }
              >
                Workflow
              </NavLink>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/games" element={<Games />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/workflow" element={<WorkflowBuilder />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
