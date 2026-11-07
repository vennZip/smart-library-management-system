import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return <Routes><Route element={<AppLayout />}><Route index element={<DashboardPage />} /><Route path="catalog" element={<PlaceholderPage title="Book catalog" />} /><Route path="borrowing" element={<PlaceholderPage title="Borrowing" />} /><Route path="members" element={<PlaceholderPage title="Members" />} /><Route path="reports" element={<PlaceholderPage title="Reports" />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
