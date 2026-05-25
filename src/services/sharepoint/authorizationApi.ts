import { spConfig } from "./spConfig.ts";
import { spGetJson } from "./spHttp.ts";

type SpRecord = Record<string, unknown>;

export type AuthorizationResult = {
  isAdmin: boolean;
  hasAccess: boolean;
  allowedUnits: string[];
};

type CurrentUserResponse = {
  Id?: unknown;
  IsSiteAdmin?: unknown;
};

type CurrentUserGroup = {
  Id?: unknown;
  Title?: unknown;
};

type UnitGroupItem = {
  Title?: unknown;
  members?: unknown;
};

const ADMIN_GROUP_NAMES = new Set(["admin", "capex admin"]);

function asRecord(value: unknown): SpRecord {
  return value && typeof value === "object" ? (value as SpRecord) : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readCollection(value: unknown): SpRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const nested = asRecord(value).results;
  return Array.isArray(nested) ? nested.map(asRecord) : [];
}

function readMemberIds(members: unknown): Set<number> {
  return new Set(
    readCollection(members)
      .map((member) => readNumber(member.Id))
      .filter((id): id is number => id != null)
  );
}

function buildPrincipalIds(userId: number | undefined, groups: CurrentUserGroup[]): Set<number> {
  const principalIds = new Set<number>();
  if (userId != null) principalIds.add(userId);
  groups.forEach((group) => {
    const groupId = readNumber(group.Id);
    if (groupId != null) principalIds.add(groupId);
  });
  return principalIds;
}

function isMemberOfAdminUnit(unitGroups: UnitGroupItem[], principalIds: Set<number>): boolean {
  const adminUnit = unitGroups.find((item) => item.Title === "ADMIN");
  if (!adminUnit) return false;

  const memberIds = readMemberIds(adminUnit.members);
  return Array.from(principalIds).some((principalId) => memberIds.has(principalId));
}

async function getCurrentUser(): Promise<CurrentUserResponse> {
  const url = `${spConfig.siteUrl}/_api/web/currentuser?$select=Id,IsSiteAdmin`;
  return spGetJson<CurrentUserResponse>(url);
}

async function getCurrentUserGroups(): Promise<CurrentUserGroup[]> {
  const url = `${spConfig.siteUrl}/_api/web/currentuser/groups?$select=Id,Title`;
  const response = await spGetJson<{ value?: unknown; d?: { results?: unknown } }>(url);
  if (Array.isArray(response.value)) return response.value.map(asRecord);
  if (Array.isArray(response.d?.results)) return response.d.results.map(asRecord);
  return [];
}

async function getUnitGroups(): Promise<UnitGroupItem[]> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('UnitGroups')/items?$select=Title,members/Id,members/Title&$expand=members&$top=5000`;
  const response = await spGetJson<{ value?: unknown; d?: { results?: unknown } }>(url);
  if (Array.isArray(response.value)) return response.value.map(asRecord);
  if (Array.isArray(response.d?.results)) return response.d.results.map(asRecord);
  return [];
}

function resolveAdmin(isSiteAdmin: boolean, groups: CurrentUserGroup[]): boolean {
  if (isSiteAdmin) return true;
  return groups.some((group) => {
    const name = readString(group.Title)?.toLocaleLowerCase("pt-BR");
    return name ? ADMIN_GROUP_NAMES.has(name) : false;
  });
}

export async function resolveAuthorization(): Promise<AuthorizationResult> {
  const [currentUser, currentUserGroups, unitGroups] = await Promise.all([
    getCurrentUser(),
    getCurrentUserGroups(),
    getUnitGroups()
  ]);

  const userId = readNumber(currentUser.Id);
  const isSiteAdmin = readBoolean(currentUser.IsSiteAdmin);
  const principalIds = buildPrincipalIds(userId, currentUserGroups);
  const isUnitAdmin = isMemberOfAdminUnit(unitGroups, principalIds);
  const isAdmin = isUnitAdmin || resolveAdmin(isSiteAdmin, currentUserGroups);

  if (isAdmin) {
    return { isAdmin: true, hasAccess: true, allowedUnits: [] };
  }

  const allowedUnits = new Set<string>();
  unitGroups.forEach((item) => {
    const title = readString(item.Title);
    if (!title) return;

    const memberIds = readMemberIds(item.members);
    const matches = Array.from(principalIds).some((principalId) => memberIds.has(principalId));
    if (matches) allowedUnits.add(title);
  });

  return {
    isAdmin: false,
    hasAccess: allowedUnits.size > 0,
    allowedUnits: Array.from(allowedUnits).sort((a, b) => a.localeCompare(b, "pt-BR"))
  };
}
