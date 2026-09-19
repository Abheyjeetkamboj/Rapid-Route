import { Outlet } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { type AppRole } from '../../types/roles';
import { AccessRestricted } from './AccessRestricted';

interface RoleProtectedRouteProps {
  allowedRoles: AppRole[];
  workspaceName?: string;
  children?: React.ReactNode;
}

export function RoleProtectedRoute({
  allowedRoles,
  workspaceName,
  children,
}: RoleProtectedRouteProps) {
  const { currentRole } = useRole();

  if (!allowedRoles.includes(currentRole)) {
    return <AccessRestricted workspaceName={workspaceName} allowedRoles={allowedRoles} />;
  }

  return children ? <>{children}</> : <Outlet />;
}

