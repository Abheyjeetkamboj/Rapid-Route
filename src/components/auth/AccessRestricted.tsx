import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { type AppRole, ROLE_CONFIGS } from '../../types/roles';

interface AccessRestrictedProps {
  workspaceName?: string;
  allowedRoles?: AppRole[];
}

export function AccessRestricted({ workspaceName = 'this workspace', allowedRoles }: AccessRestrictedProps) {
  const { currentRole, currentConfig, setDemoRole, availableRoles } = useRole();
  const navigate = useNavigate();

  const handleSwitchAndStay = (newRole: AppRole) => {
    setDemoRole(newRole);
    // If the new role is allowed for this page, it will automatically render the page!
  };

  const handleReturnToWorkspace = () => {
    navigate(currentConfig.defaultPath);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 sm:p-10">
      <div className="max-w-lg w-full bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
        {/* Shield Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-accent-redSubtle text-accent-red border border-accent-red/20">
            Access Restricted
          </span>
          <h2 className="text-xl font-bold text-fg tracking-tight">
            Unauthorized Workspace
          </h2>
          <p className="text-sm text-fg-muted leading-relaxed">
            Your current demo role (<span className="font-semibold text-fg">{currentConfig.title}</span>)
            does not have permission to access <span className="font-semibold text-fg">{workspaceName}</span>.
          </p>
        </div>

        {/* Allowed Roles Info */}
        {allowedRoles && allowedRoles.length > 0 && (
          <div className="p-3.5 rounded-xl bg-surface-raised/70 border border-border-subtle text-xs text-left space-y-1.5">
            <p className="text-[11px] font-semibold text-fg-faint uppercase tracking-wider">
              Authorized Demo Roles for this Workspace:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {allowedRoles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-mono font-medium text-fg"
                >
                  {ROLE_CONFIGS[r].title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Role Switcher Action */}
        <div className="pt-2 border-t border-border-subtle space-y-3">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span className="flex items-center gap-1 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-accent-blue" />
              Switch Demo Role:
            </span>
            <span className="text-[11px] font-mono text-fg-faint">Immediate permission update</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {availableRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSwitchAndStay(role.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all border ${
                  currentRole === role.id
                    ? 'bg-accent-blueSubtle text-accent-blue border-accent-blue/40 shadow-xs'
                    : 'bg-surface-raised hover:bg-surface border-border-subtle text-fg-muted hover:text-fg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{role.label}</span>
                  <span className="text-[10px] font-mono opacity-70">{role.userBadge}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Return Button */}
        <button
          onClick={handleReturnToWorkspace}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold shadow-sm transition-all"
        >
          <span>Return to {currentConfig.title} Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

