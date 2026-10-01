import { useNodeView } from '../src/nodeView.jsx'

/* Opening the view from your own handler rather than from a link. */
export default function RowMenu({ element }) {
  const openNode = useNodeView()
  return (
    <button type="button" onClick={() => openNode(element)}>
      Open node view
    </button>
  )
}
