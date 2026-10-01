import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NodeViewProvider } from './nodeView.jsx'
import NodePage from './pages/NodePage.jsx'
import NocDashboard from './components/NocDashboard.jsx'
import './index.css'
import './dashboard.css'

export default function App() {
  return (
    <BrowserRouter>
      <NodeViewProvider>
        <Routes>
          <Route path="/" element={<NocDashboard />} />
          <Route path="/node/:ref" element={<NodePage />} />
        </Routes>
      </NodeViewProvider>
    </BrowserRouter>
  )
}
