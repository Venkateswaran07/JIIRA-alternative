import { createPgModel } from "../db/pgModel.js";
import { User } from "./User.js";

export interface IAssistLedger {
  id?: string;
  _id?: string;
  organization: string;
  ticketId: string;
  ticketKey: string;
  title: string;
  originalAssignee?: string;
  completedBy: string;
  storyPoints: number;
  credits: number;
  completedAt: Date;
  createdAt?: Date;
}

export const AssistLedger = createPgModel({
  table: "assist_ledger",
  columns: [
    "organization",
    "ticketId",
    "ticketKey",
    "title",
    "originalAssignee",
    "completedBy",
    "storyPoints",
    "credits",
    "completedAt",
  ],
  defaults: {
    storyPoints: 0,
    credits: 0,
    completedAt: () => new Date(),
  },
  relations: {
    originalAssignee: { model: () => User },
    completedBy: { model: () => User },
  },
});
