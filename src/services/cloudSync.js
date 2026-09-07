/**
 * ===================================================================
 * خدمة المزامنة السحابية الفورية — Cloud Sync Service (Firebase)
 * ===================================================================
 * مزامنة حية ولحظية للمشاريع، اليوميات، الصور، وإعدادات الشركات عبر Firestore.
 */

import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

function cleanCompanyId(companyId) {
  if (!companyId) return null;
  if (typeof companyId === 'object') {
    return companyId.id || companyId.companyId || 'comp_alain';
  }
  return String(companyId).trim();
}

/**
 * حفظ ومزامنة المشاريع في السحابة
 */
export async function syncProjectsToCloud(companyId, projects) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !projects) return;
  try {
    const docRef = doc(db, 'companies', cId);
    await setDoc(docRef, {
      projects: projects,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud sync (projects) skipped or offline:", error.message);
    return false;
  }
}

/**
 * جلب المشاريع من السحابة
 */
export async function fetchProjectsFromCloud(companyId) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return null;
  try {
    const docRef = doc(db, 'companies', cId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data()?.projects || null;
    }
  } catch (error) {
    console.warn("Cloud fetch (projects) offline or error:", error.message);
  }
  return null;
}

/**
 * الاستماع الفوري والتحديث اللحظي للمشاريع (Real-time Listener)
 */
export function subscribeToCloudProjects(companyId, onUpdate) {
  const cId = cleanCompanyId(companyId);
  if (!cId || typeof onUpdate !== 'function') return () => {};
  try {
    const docRef = doc(db, 'companies', cId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.projects)) {
          onUpdate(data.projects);
        }
      }
    }, (err) => {
      console.warn("Cloud snapshot error (projects):", err.message);
    });
    return unsubscribe;
  } catch (e) {
    console.warn("Could not subscribe to cloud projects:", e);
    return () => {};
  }
}

/**
 * حفظ فريق العمل في السحابة
 */
export async function syncTeamToCloud(companyId, team) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !team) return;
  try {
    const docRef = doc(db, 'companies', cId);
    await setDoc(docRef, {
      team,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn("Cloud sync (team) error:", e.message);
  }
}

/**
 * حفظ عملاء الـ CRM في السحابة
 */
export async function syncLeadsToCloud(companyId, leads) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !leads) return;
  try {
    const docRef = doc(db, 'companies', cId);
    await setDoc(docRef, {
      leads,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn("Cloud sync (leads) error:", e.message);
  }
}
