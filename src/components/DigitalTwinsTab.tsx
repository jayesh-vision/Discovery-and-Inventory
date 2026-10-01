import { NodeViewProvider } from '../../node-view-source/src/nodeView.jsx';
import NocDashboard from '../../node-view-source/src/components/NocDashboard.jsx';
import '../../node-view-source/src/index.css';
import '../../node-view-source/src/dashboard.css';

interface DigitalTwinsTabProps {
  currentNode?: string;
}

export default function DigitalTwinsTab({ currentNode }: DigitalTwinsTabProps) {
  return (
    <div className="digital-twins-tab-wrapper">
      <NodeViewProvider>
        <NocDashboard currentNode={currentNode} />
      </NodeViewProvider>
    </div>
  );
}
