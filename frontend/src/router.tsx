import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Home } from './pages/Home.js';
import { NewFamily } from './pages/NewFamily.js';
import { Editor } from './pages/Editor.js';
import { TreeView } from './pages/TreeView.js';
import { SharedView } from './pages/SharedView.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/nouvelle-famille',
    element: <NewFamily />,
  },
  {
    path: '/e/:familyId',
    element: <Editor />,
  },
  {
    path: '/e/:familyId/arbre',
    element: <TreeView />,
  },
  {
    path: '/exemple',
    element: <SharedView demo />,
  },
  {
    path: '/f/:shareId',
    element: <SharedView />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
