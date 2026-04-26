import { Router } from "express";
import { db, generateId, VALID_STATUSES, type ApplicationRow } from "../db.js";

export const applicationsRouter = Router();

const USE_CASES = ["payroll", "treasury", "merchant", "remittance", "transfers"];

function validateApplication(body: Record<string, string>) {
  const errors: string[] = [];
  if (!body.fullName?.trim()) errors.push("fullName is required");
  if (!body.workEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.workEmail))
    errors.push("valid workEmail is required");
  if (!body.company?.trim()) errors.push("company is required");
  if (!body.role?.trim()) errors.push("role is required");
  if (!body.useCase || !USE_CASES.includes(body.useCase)) errors.push("valid useCase is required");
  if (!body.teamSize?.trim()) errors.push("teamSize is required");
  if (!body.region?.trim()) errors.push("region is required");
  if (!body.monthlyVolume?.trim()) errors.push("monthlyVolume is required");
  if (!body.currentRail?.trim()) errors.push("currentRail is required");
  if (!body.privacyConcern?.trim()) errors.push("privacyConcern is required");
  if (!body.whyConfidential?.trim() || body.whyConfidential.trim().length < 10)
    errors.push("whyConfidential must be at least 10 characters");
  return errors;
}

function toPublic(row: ApplicationRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    workEmail: row.work_email,
    company: row.company,
    role: row.role,
    useCase: row.use_case,
    teamSize: row.team_size,
    region: row.region,
    monthlyVolume: row.monthly_volume,
    currentRail: row.current_rail,
    privacyConcern: row.privacy_concern,
    whyConfidential: row.why_confidential,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

applicationsRouter.post("/", (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const errors = validateApplication(body);
    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const existingByEmail = db
      .prepare("SELECT id FROM applications WHERE work_email = ?")
      .get(body.workEmail.toLowerCase().trim()) as { id: string } | undefined;

    if (existingByEmail) {
      return res.status(409).json({
        error: "An application with this email already exists",
        existingId: existingByEmail.id,
      });
    }

    const id = generateId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO applications (
        id, full_name, work_email, company, role, use_case, team_size, region,
        monthly_volume, current_rail, privacy_concern, why_confidential,
        status, internal_notes, review_priority, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'under_review', '', 'normal', '', ?, ?)
    `).run(
      id,
      body.fullName.trim(),
      body.workEmail.toLowerCase().trim(),
      body.company.trim(),
      body.role.trim(),
      body.useCase,
      body.teamSize,
      body.region,
      body.monthlyVolume,
      body.currentRail,
      body.privacyConcern,
      body.whyConfidential.trim(),
      now,
      now
    );

    const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow;
    return res.status(201).json(toPublic(row));
  } catch (err) {
    console.error("POST /api/applications error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

applicationsRouter.get("/:id", (req, res) => {
  try {
    const row = db
      .prepare("SELECT * FROM applications WHERE id = ?")
      .get(req.params.id) as ApplicationRow | undefined;

    if (!row) {
      return res.status(404).json({ error: "Application not found" });
    }

    return res.json(toPublic(row));
  } catch (err) {
    console.error("GET /api/applications/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
