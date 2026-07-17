import { ReactNode, useContext } from 'react';
import { Navigate } from 'react-router-dom';

import { PermissionAliasEnum, TPermissionGroupAliasEnum } from './auth.api';
import { AuthCtx } from './auth.context';

interface AuthProtectionProps {
  isProtected?: boolean;
  children: ReactNode;
  /* isAdmin is used to check if the user is an admin or superuser */
  isAdmin?: boolean;
  /* isSuperUser is used to check if the user is a superuser */
  isSuperUser?: boolean;
}

export const AuthProtection = ({
  isProtected,
  children,
  isAdmin,
  isSuperUser,
}: AuthProtectionProps) => {
  const { isAuthenticated, userData } = useContext(AuthCtx);

  if (isProtected === undefined) return children;

  if (isProtected && !isAuthenticated) return <Navigate to={'/signin'} />;

  if (isProtected === false && isAuthenticated) return <Navigate to={'/'} />;

  // Prevent accessing the page when user data is still not defined
  if (isProtected && !userData) {
    return null;
  }

  if (isAdmin && userData && userData.role === 'basic') return <Navigate to={'/'} />;

  if (isSuperUser && userData && (userData.role === 'basic' || userData.role === 'admin'))
    return <Navigate to={'/'} />;

  return children;
};

type ReadAuthProtectionProps = {
  children: ReactNode;
  permissionGroupAlias: TPermissionGroupAliasEnum;
};

export const ReadAuthProtection = ({ children, permissionGroupAlias }: ReadAuthProtectionProps) => {
  const { hasPermission } = useContext(AuthCtx);

  if (hasPermission(permissionGroupAlias, PermissionAliasEnum.enum.read)) return children;
  else return <Navigate to={'/'} />;
};

export const withAuth = (
  Wrapped: React.ComponentType,
  permissionGroupAlias?: TPermissionGroupAliasEnum
) =>
  function Protected() {
    return permissionGroupAlias ? (
      <ReadAuthProtection permissionGroupAlias={permissionGroupAlias}>
        <Wrapped />
      </ReadAuthProtection>
    ) : (
      <Wrapped />
    );
  };
