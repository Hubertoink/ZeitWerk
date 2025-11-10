import apiService from '../services/api-service';

// Repairs organizationId mismatches for existing shifts that were copied previously
// to ensure MonthView/exports include them. Runs client-side via Electron API.
export async function repairCopiedShiftsInconsistencies(): Promise<{ checked: number; fixed: number }>{
  try {
    const [employees, shifts] = await Promise.all([
      apiService.getEmployees(),
      apiService.getShifts()
    ]);
    const empOrg = new Map<string, string>();
    for (const emp of employees) {
      if (emp?.id && emp?.organizationId != null) {
        empOrg.set(emp.id.toString(), emp.organizationId.toString());
      }
    }
    let fixed = 0;
    let checked = 0;
    for (const s of shifts) {
      checked++;
      const eid = s.employeeId?.toString?.();
      if (!eid) continue;
      const expectedOrg = empOrg.get(eid);
      if (!expectedOrg) continue;
      const currentOrg = s.organizationId?.toString?.();
      if (currentOrg !== expectedOrg) {
        try {
          await apiService.updateShift(s.id, { organizationId: expectedOrg });
          fixed++;
        } catch (e) {
          console.warn('Migration: failed to fix shift', s.id, e);
        }
      }
    }
    console.log(`Migration: repairCopiedShiftsInconsistencies checked=${checked} fixed=${fixed}`);
    return { checked, fixed };
  } catch (e) {
    console.error('Migration error:', e);
    return { checked: 0, fixed: 0 };
  }
}
