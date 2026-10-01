import { useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import NodeDetails from '../components/NodeDetails.jsx'
import { resolveElement, externalElement } from '../data.js'
import '../index.css'
import '../dashboard.css'

const inFrame = (() => { try { return window.self !== window.top } catch { return true } })()
const CLOSE = { type: 'fm:node-view:close' }

export default function NodePage() {
  const { ref } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const asked = decodeURIComponent(ref || '')
  const known = resolveElement(asked)
  /* An element this estate does not hold, described by the application that
     asked for it: drawn from that description, with no alarms. */
  const external = useMemo(() => {
    if (known) return null
    const info = Object.fromEntries(['equipment', 'domain', 'vendor', 'city', 'region', 'ip', 'tech', 'source']
      .map(k => [k, params.get(k)]).filter(([, v]) => v))
    return info.equipment || info.domain ? externalElement(asked, info) : null
  }, [known, asked, params])
  const node = known || (external && external.name)
  const overlay = params.get('overlay') === '1'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.classList.toggle('fm-overlay', overlay)
    return () => document.documentElement.classList.remove('fm-overlay')
  }, [overlay])

  useEffect(() => {
    if (inFrame) window.parent.postMessage({ type: 'fm:node-view:ready', node, ref }, '*')
  }, [node, ref])

  const close = () => {
    if (inFrame) {
      try { window.parent.postMessage({ ...CLOSE, node }, '*') } catch (e) {}
    }
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/inventory/physical')
    }
  }

  if (!node) {
    return (
      <div className="np-missing">
        <h3>No element called “{decodeURIComponent(ref || '')}”</h3>
        <p className="muted">The node view opens by element name (e.g. KOL-CRT-008) or by the management IP its alerts carry. An element from another application also needs at least its equipment type or domain (?equipment=Router&amp;domain=Transport).</p>
        <button className="chip-btn" onClick={close}>Close</button>
      </div>
    )
  }
  return <NodeDetails key={node} node={node} external={external} onClose={close} isDirectPage={true} />
}
