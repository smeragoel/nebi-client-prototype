import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import CompareVersions from '@/screens/CompareVersions'
import CreateProject from '@/screens/CreateProject'
import CreateVersion from '@/screens/CreateVersion'
import JobDetails from '@/screens/JobDetails'
import Jobs from '@/screens/Jobs'
import ProjectDetails from '@/screens/ProjectDetails'
import ProjectsList from '@/screens/ProjectsList'
import Server from '@/screens/Server'
import ServerUi from '@/screens/ServerUi'
import Start from '@/screens/Start'
import { StoreProvider } from '@/state/store'

export default function App() {
  return (
    <StoreProvider>
      <TooltipProvider>
        <Toaster>
          <div className="flex min-h-screen flex-col">
            <ScrollToTop />
            <Header />
            <Routes>
              <Route path="/" element={<ProjectsList />} />
              <Route path="/projects/new" element={<CreateProject />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/projects/:id/new-version" element={<CreateVersion />} />
              <Route path="/projects/:id/compare" element={<CompareVersions />} />
              <Route path="/server" element={<Server />} />
              <Route path="/server-ui" element={<ServerUi />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/screens" element={<Start />} />
            </Routes>
          </div>
        </Toaster>
      </TooltipProvider>
    </StoreProvider>
  )
}

/** The server UI (`/server-ui`) is a separate app with its own header. */
function Header() {
  const { pathname } = useLocation()
  return pathname.startsWith('/server-ui') ? null : <AppHeader />
}

/** New screens start at the top. Changing only `?v=` (picking a version) keeps the scroll. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
