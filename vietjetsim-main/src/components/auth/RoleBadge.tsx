import { UserRole } from '@/types/database';
import { isAdminRole } from '@/contexts/AuthContext';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const isAdmin = isAdminRole(role);

  if (size === 'sm') {
    return isAdmin ? (
      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-100 text-primary rounded-full">
        Admin
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
        User
      </span>
    );
  }

  return isAdmin ? (
    <span className="px-2 py-1 text-xs font-bold bg-primary-100 text-primary rounded-full">
      Admin
    </span>
  ) : (
    <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">User</span>
  );
}

interface RoleDotProps {
  role: UserRole;
}

export function RoleDot({ role }: RoleDotProps) {
  return isAdminRole(role) ? (
    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
  ) : (
    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
  );
}
