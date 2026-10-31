import { useEffect, useState } from 'react';
import {
  getActiveTenant,
  getActiveTenantId,
  getStoredTenants,
  setActiveTenantId,
  type TenantCompany,
  type TenantPlan,
  SAAS_PLANS,
} from '@/lib/tenants';

export function useTenants() {
  const [tenants, setTenants] = useState<TenantCompany[]>(() => getStoredTenants());
  const [activeTenant, setActiveTenant] = useState<TenantCompany>(() => getActiveTenant());

  useEffect(() => {
    const handleTenantsUpdate = () => {
      setTenants(getStoredTenants());
      setActiveTenant(getActiveTenant());
    };

    const handleActiveChange = () => {
      setActiveTenant(getActiveTenant());
    };

    window.addEventListener('gestaox-tenants-updated', handleTenantsUpdate);
    window.addEventListener('gestaox-active-tenant-changed', handleActiveChange);

    return () => {
      window.removeEventListener('gestaox-tenants-updated', handleTenantsUpdate);
      window.removeEventListener('gestaox-active-tenant-changed', handleActiveChange);
    };
  }, []);

  const switchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setActiveTenant(getActiveTenant());
  };

  const currentPlan: TenantPlan | undefined = SAAS_PLANS.find(
    (p) => p.id === activeTenant?.planId
  );

  return {
    tenants,
    activeTenant,
    currentPlan,
    switchTenant,
    plans: SAAS_PLANS,
  };
}
