import { buildUserAccessProfile, type UserAccessProfile } from "../domain/accessControl";
import { getActiveMaterialAccessControlRecords } from "../services/sharepoint/materialAccessControlRepository";
import { getCurrentSharePointUser } from "../services/sharepoint/repositories/currentUserRepository";

export async function resolveCurrentUserAccess(): Promise<UserAccessProfile> {
  let userEmail = "";
  try { userEmail = (await getCurrentSharePointUser()).email.trim().toLowerCase(); } catch { return buildUserAccessProfile({ userEmail, roles: ["USER"] }); }
  try {
    const records = (await getActiveMaterialAccessControlRecords()).filter((record) => record.userEmail === userEmail);
    return buildUserAccessProfile({ userEmail, roles: records.map((record) => record.role), centers: records.map((record) => record.center) });
  } catch {
    return buildUserAccessProfile({ userEmail, roles: ["USER"] });
  }
}
