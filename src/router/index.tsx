import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import NotFound from '../pages/NotFound';
import Home from '../pages/Home/Home';
import Dashboard from '../pages/Dashboard/Dashboard';
import RepoSelect from '../pages/RepoSelect/RepoSelect';
import RepoSummary from '../pages/RepoSummary/RepoSummary';
import Callback from '../pages/Callback';

// GitHub 레포지토리 요약 서비스 라우터
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'repositories',
        element: <RepoSelect />,
      },
      {
        path: 'repositories/:owner/:repoId/summary',
        element: <RepoSummary />,
      },
    ],
  },
  {
    path: '/callback',
    element: <Callback />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
