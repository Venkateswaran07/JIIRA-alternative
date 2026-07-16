import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    preview: {
      sprintHealth: 84,
      completed: 32,
      planned: 41,
      velocityChange: 18,
      risk: 12,
      blockersResolved: 3,
      confidence: 92,
      risksCaught: 2,
    },
    proof: { avatars: ["AK", "JM", "RL"], additional: "+2k" },
    logos: ["northstar", "Vertex", "APERTURE", "lumon", "QUANTUM"],
    testimonial: {
      quote: "I-TRACK gave us back the one thing our team was missing: a shared sense of what matters.",
      name: "Maya Chen",
      title: "VP of Product at Northstar",
      initials: "MC",
    },
  });
});

export default router;
