import { spConfig } from "../spConfig";
import { spGetJson } from "../spHttp";

type CurrentUserResponse = {
  Title?: unknown;
  Email?: unknown;
  LoginName?: unknown;
};

export interface SharePointCurrentUser {
  name: string;
  email: string;
  loginName: string;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function getCurrentSharePointUser(): Promise<SharePointCurrentUser> {
  const url = `${spConfig.siteUrl}/_api/web/currentuser?$select=Title,Email,LoginName`;
  const data = await spGetJson<CurrentUserResponse>(url);

  return {
    name: readString(data.Title),
    email: readString(data.Email),
    loginName: readString(data.LoginName),
  };
}
