import AuthGate from './AuthGate';
import Panel from '../panel/Panel';

export default function CloudApp() {
  return <AuthGate>{(store, logout) => <Panel store={store} onLogout={logout} />}</AuthGate>;
}
