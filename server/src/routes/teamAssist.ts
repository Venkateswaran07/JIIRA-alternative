import { Router } from "express";
import { type AuthRequest } from "../middleware/auth.js";
import { Ticket } from "../models/Ticket.js";
import {
  runPredictiveRiskDetection,
  generatePerformanceIntelligenceReport,
} from "../services/assistService.js";

const router = Router();

// Helper to get organization ID
const orgId = (req: AuthRequest) => req.user!.organizationId;

// GET /api/v1/team-assist/triage - Get all triage tickets
router.get("/triage", async (req: AuthRequest, res) => {
  try {
    const tickets = await Ticket.find({
      organization: orgId(req),
      isAssisted: true,
      status: { $ne: "Done" },
      archivedAt: { $exists: false },
    })
      .populate("assignee")
      .populate("assistOriginalAssignee")
      .populate("project")
      .populate("sprint");
    
    return res.json({ tickets });
  } catch (error) {
    console.error("Error fetching triage tickets:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/v1/team-assist/report - Performance Intelligence Report
router.get("/report", async (req: AuthRequest, res) => {
  try {
    const report = await generatePerformanceIntelligenceReport(orgId(req) || "");
    return res.json({ report });
  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/v1/team-assist/trigger-check - Force AI listener to run risk check on all incomplete tickets
router.post("/trigger-check", async (req: AuthRequest, res) => {
  try {
    const tickets = await Ticket.find({
      organization: orgId(req),
      status: { $ne: "Done" },
      assignee: { $exists: true, $ne: null },
      archivedAt: { $exists: false },
    });

    let triggeredCount = 0;
    for (const ticket of tickets) {
      const triggered = await runPredictiveRiskDetection(ticket as any);
      if (triggered) {
        await ticket.save();
        triggeredCount++;
      }
    }

    return res.json({
      success: true,
      message: `AI Listener checked ${tickets.length} tickets. Automatically triaged ${triggeredCount} ticket(s) to public Collaboration Board.`,
      triggeredCount,
    });
  } catch (error) {
    console.error("Error running trigger check:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
