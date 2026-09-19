import React, { createContext, useContext, useMemo } from 'react';

/**
 * ===================================================================
 * سياق الصلاحيات المركزي — Admin Context
 * ===================================================================
 * يوفر الصلاحيات (role)، الشركة (companyId)، وحالة السوبر أدمن (isSuperAdmin)
 * المستخرجة حصرياً ومباشرة من الـ ID Token و Firebase Custom Claims.
 */

export const AdminContext = createContext({
  role: 'engineer',
  companyId: null,
  isSuperAdmin: false,
  currentUser: null,
  isAuthenticated: false,
});

/**
 * Hook مخصص للاستخدام السهل داخل أي مكون في المنصة:
 * const { role, companyId, isSuperAdmin, currentUser } = useAdmin();
 */
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    return {
      role: 'engineer',
      companyId: null,
      isSuperAdmin: false,
      currentUser: null,
      isAuthenticated: false,
    };
  }
  return context;
}

export function AdminProvider({ value, children }) {
  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export default AdminContext;
