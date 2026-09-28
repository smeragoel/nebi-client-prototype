import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import CreateProject from '@/screens/CreateProject'
import CreateVersion from '@/screens/CreateVersion'
import ProjectDetails from '@/screens/ProjectDetails'
import ProjectsList from '@/screens/ProjectsList'
import Start from '@/screens/Start'
import { StoreProvider } from '@/state/store'

export default function App() {
  return (
    <StoreProvider>
      <TooltipProvider>
        <Toaster>
          <div className="flex min-h-screen flex-col">
            <ScrollToTop />
            <AppHeader />
            <Routes>
              <Route path="/" element={<ProjectsList />} />
              <Route path="/projects/new" element={<CreateProject />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/projects/:id/new-version" element={<CreateVersion />} />
              <Route path="/screens" element={<Start />} />
            </Routes>
          </div>
        </Toaster>
      </TooltipProvider>
    </StoreProvider>
  )
}

/** New screens start at the top. Changing only `?v=` (picking a version) keeps the scroll. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
