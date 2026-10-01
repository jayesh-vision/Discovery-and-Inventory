import { createContext, useContext, useState, useCallback } from 'react'
import NodeDetails from './components/NodeDetails.jsx'
import { resolveElement } from './data.js'

/**
 * One node view for the whole module.
 *
 * An element is named in a dozen places — the alert list, an incident, a
 * drill-down table, the map, the topology, the correlation fan, a blocked-NE
 * rule — and every one of them should open the same view of it. The view
 * lives here, once, above every page and dialog, and anything that names an
 * element asks for it by name or by management IP. A reference that is not an
 * element on the estate stays plain text rather than becoming a link to
 * nothing.
 *
 * Other applications reach the same view through /node/<element> (see
 * NodePage) or the drop-in public/node-view.js.
 */

const Ctx = createContext(() => {})

export function NodeViewProvider({ children }) {
  const [node, setNode] = useState(null)
  const open = useCallback(ref => { const n = resolveElement(ref); if (n) setNode(n) }, [])
  const close = useCallback(() => setNode(null), [])
  return (
    <Ctx.Provider value={open}>
      {children}
      {node && <NodeDetails node={node} onClose={close} />}
    </Ctx.Provider>
  )
}

export const useNodeView = () => useContext(Ctx)

/* An element reference that opens its node view. It stops the click there, so
   a name inside a clickable row opens the element rather than the row. */
export function NodeLink({ name, className = '', children, ...props }) {
  const open = useNodeView()
  const node = resolveElement(name)
  if (!node) return <>{children ?? name}</>
  return (
    <button type="button" className={'ad-link ' + className} title={`Open node view for ${node}`}
      onClick={e => { e.stopPropagation(); open(node) }}
      onKeyDown={e => e.stopPropagation()}
      {...props}>
      {children ?? name}
    </button>
  )
}
