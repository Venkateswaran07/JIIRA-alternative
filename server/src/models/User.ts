import { createPgModel } from "../db/pgModel.js";
import { Organization } from "./Organization.js";

export type UserRole = string;
export type InviteStatus = "active" | "invited" | "disabled";
export type NotificationPreferences = { ticketAssignments: boolean; mentionsAndComments: boolean; sprintRiskAlerts: boolean; weeklySummary: boolean; slaAlerts: boolean };
export type UiPreferences = { theme: "light" | "dark" | "system"; density: "comfortable" | "compact"; favoriteProjects: string[]; pinnedResources: string[]; dashboardWidgets: Array<{ id: string; visible: boolean }>; recentEntities: Array<{ type: string; id: string; label: string; href: string }> };
export interface IUser { id?: string; _id?: string; name: string; email: string; passwordHash: string; emailVerified: boolean; lastActiveOrganization?: string; avatarColor: string; notificationPreferences: NotificationPreferences; uiPreferences: UiPreferences }
const notificationPreferences = { ticketAssignments: true, mentionsAndComments: true, sprintRiskAlerts: true, weeklySummary: false, slaAlerts: true };
const uiPreferences = { theme: "system", density: "comfortable", favoriteProjects: [], pinnedResources: [], dashboardWidgets: [], recentEntities: [] };
export const User = createPgModel({ table: "users", columns: ["name", "email", "passwordHash", "emailVerified", "lastActiveOrganization", "avatarColor", "notificationPreferences", "uiPreferences"], json: ["notificationPreferences", "uiPreferences"], defaults: { emailVerified: true, avatarColor: "#00AEEF", notificationPreferences, uiPreferences }, relations: { lastActiveOrganization: { model: () => Organization } } });
