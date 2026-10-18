import AuthGate from './AuthGate';
import Panel from '../panel/Panel';
import StudentApp from '../portal/StudentApp';

export default function CloudApp() {
  return (
    <AuthGate>
      {(me, logout) => (me.role === 'estudiante' || me.role === 'familia'
        ? <StudentApp key={me.uid} me={me} onLogout={logout} />
        : <Panel key={me.uid} me={me} onLogout={logout} />)}
    </AuthGate>
  );
}
