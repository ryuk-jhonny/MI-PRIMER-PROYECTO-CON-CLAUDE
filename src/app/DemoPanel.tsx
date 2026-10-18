import { useMemo } from 'react';
import { createDemoStore } from '../lib/store';
import Panel from '../panel/Panel';

export default function DemoPanel() {
  const store = useMemo(() => createDemoStore(), []);
  return <Panel store={store} onLogout={() => window.location.assign('/')} />;
}
