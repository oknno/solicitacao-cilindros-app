import type { MaterialRequest } from "../../domain/materialRequest/types";
import { getMaterialRequests } from "../../services/sharepoint/repositories/materialRequestRepository";

export async function getMaterialRequestsUseCase(): Promise<MaterialRequest[]> {
  return getMaterialRequests();
}
