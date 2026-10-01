import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NodeViewProvider, NodeLink } from '../src/nodeView.jsx'
import NodePage from '../src/pages/NodePage.jsx'
import '../src/index.css'

/**
 * The two ways to mount the node view in your own application.
 *
 * 1. As an overlay over whatever page the reader is on. Wrap the app once in
 *    NodeViewProvider; anything that names an element renders <NodeLink>, or
 *    calls useNodeView() and passes a name or a management IP.
 *
 * 2. At an address of its own, /node/<element>, so the view can be linked to,
 *    bookmarked or framed. That is NodePage.
 *
 * Both draw the same component; neither needs the other.
 */
export default function App() {
  return (
    <BrowserRouter>
      <NodeViewProvider>
        <Routes>
          <Route path="/" element={<YourInventory />} />
          <Route path="/node/:ref" element={<NodePage />} />
        </Routes>
      </NodeViewProvider>
    </BrowserRouter>
  )
}

/* Anywhere in your own pages: an element name that opens the view. */
function YourInventory() {
  return (
    <table className="tbl">
      <tbody>
        <tr>
          <td><NodeLink name="KOL-CRT-008" /></td>
          <td>Kolkata · Router</td>
        </tr>
        <tr>
          {/* A management IP resolves to the same element. */}
          <td><NodeLink name="10.29.9.63" /></td>
          <td>Delhi · Transponder</td>
        </tr>
      </tbody>
    </table>
  )
}
