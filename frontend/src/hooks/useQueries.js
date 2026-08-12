import { useQuery } from '@tanstack/react-query';
import { adminAPI, billAPI, orgAPI } from '../services/api';

export function useBillsSummary() {
  return useQuery({
    queryKey: ['bills', 'summary'],
    queryFn: async () => (await billAPI.summary()).data,
    staleTime: 30 * 1000,
  });
}

export function useOrgCount() {
  return useQuery({
    queryKey: ['organizations', 'count'],
    queryFn: async () => (await orgAPI.list({ limit: 1 })).data.pagination?.total || 0,
    staleTime: 60 * 1000,
  });
}

export function usePayeeDashboard() {
  return useQuery({
    queryKey: ['payee', 'dashboard'],
    queryFn: async () => {
      const [orgRes, billsRes] = await Promise.all([orgAPI.mine(), billAPI.orgList({ limit: 6 })]);
      return {
        org: orgRes.data.organization || null,
        bills: billsRes.data.bills || [],
        pendingCount: billsRes.data.pendingCount || 0,
        approvedCount: billsRes.data.approvedCount || 0,
        rejectedCount: billsRes.data.rejectedCount || 0,
      };
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await adminAPI.overview()).data.overview,
    staleTime: 30 * 1000,
  });
}
