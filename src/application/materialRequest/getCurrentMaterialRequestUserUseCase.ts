import { getCurrentSharePointUser } from "../../services/sharepoint/repositories/currentUserRepository";

export interface GetCurrentMaterialRequestUserOutput {
  name: string;
  email: string;
}

const FALLBACK_USER: GetCurrentMaterialRequestUserOutput = {
  name: "Usuário atual",
  email: "",
};

export async function getCurrentMaterialRequestUserUseCase(): Promise<GetCurrentMaterialRequestUserOutput> {
  try {
    const user = await getCurrentSharePointUser();
    return {
      name: user.name || FALLBACK_USER.name,
      email: user.email || FALLBACK_USER.email,
    };
  } catch {
    return FALLBACK_USER;
  }
}
