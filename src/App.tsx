import { lazy, Suspense } from 'react';
import { usePath } from './lib/router';
import { cloudEnabled } from './lib/env';
import FullLoader from './app/FullLoader';
import Landing from './pages/Landing';

const CloudApp = lazy(() => import('./app/CloudApp'));
const SetupNeeded = lazy(() => import('./app/SetupNeeded'));
const FamilyPortal = lazy(() => import('./portal/FamilyPortal'));
const Privacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })));

export default function App() {
  const path = usePath();
  const portal = path.match(/^\/c\/([a-f0-9]{16,64})\/?$/i);

  let page;
  if (portal) page = <FamilyPortal token={portal[1].toLowerCase()} />;
  else if (path.startsWith('/app')) page = cloudEnabled ? <CloudApp /> : <SetupNeeded />;
  else if (path.startsWith('/privacidad')) page = <Privacy />;
  else if (path.startsWith('/terminos')) page = <Terms />;
  else page = <Landing />;

  return <Suspense fallback={<FullLoader />}>{page}</Suspense>;
}
