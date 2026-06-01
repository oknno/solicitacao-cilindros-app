import { filterMaterialRequestsByAccess, type UserAccessProfile } from "../../domain/accessControl";
import type { MaterialRequest } from "../../domain/materialRequest/types";
import { getMaterialRequests } from "../../services/sharepoint/repositories/materialRequestRepository";

export async function getMaterialRequestsUseCase(accessProfile: UserAccessProfile): Promise<MaterialRequest[]> {
  return filterMaterialRequestsByAccess(accessProfile, await getMaterialRequests());
}
