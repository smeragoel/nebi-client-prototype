import { Route, Routes } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
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
            <AppHeader />
            <Routes>
              <Route path="/" element={<ProjectsList />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/screens" element={<Start />} />
            </Routes>
          </div>
        </Toaster>
      </TooltipProvider>
    </StoreProvider>
  )
}
