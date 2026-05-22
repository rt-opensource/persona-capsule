const SOUL_TYPES = new Set(["value", "style", "preference"]);
const MEMORY_TYPES = new Set(["fact", "preference", "value", "relationship"]);
const BOUNDARY_TYPES = new Set(["boundary"]);

export function buildDistillProposals(claims) {
  return {
    "SOUL.md": buildSoulProposal(claims),
    "MEMORY_POLICY.md": buildMemoryProposal(claims),
    "BOUNDARIES.md": buildBoundariesProposal(claims)
  };
}

function buildSoulProposal(claims) {
  const soulClaims = claims.filter((claim) => SOUL_TYPES.has(claim.type));

  return [
    "# SOUL Proposal",
    "",
    "Generated from evidence-backed claims. Review manually before copying into `SOUL.md`.",
    "",
    "## Values And Preferences",
    "",
    ...formatClaimList(soulClaims.filter((claim) => claim.type !== "style")),
    "",
    "## Voice And Style",
    "",
    ...formatClaimList(soulClaims.filter((claim) => claim.type === "style")),
    "",
    "## Uncertainty",
    "",
    "- Keep inferred or stylistic claims labeled with confidence. Do not present them as verified facts.",
    ""
  ].join("\n");
}

function buildMemoryProposal(claims) {
  const rememberClaims = claims.filter((claim) => MEMORY_TYPES.has(claim.type));
  const reviewClaims = claims.filter((claim) => claim.confidence === "inferred" || claim.confidence === "unknown");

  return [
    "# Memory Policy Proposal",
    "",
    "Generated from claims. Review manually before copying into `MEMORY_POLICY.md`.",
    "",
    "## Remember",
    "",
    ...formatClaimList(rememberClaims),
    "",
    "## Review Required",
    "",
    ...formatClaimList(reviewClaims),
    "",
    "## Do Not Remember",
    "",
    "- Do not store claims that lack source evidence or authorization.",
    ""
  ].join("\n");
}

function buildBoundariesProposal(claims) {
  const boundaryClaims = claims.filter((claim) => BOUNDARY_TYPES.has(claim.type));
  const uncertaintyClaims = claims.filter((claim) => claim.confidence === "inferred" || claim.confidence === "unknown");

  return [
    "# Boundaries Proposal",
    "",
    "Generated from boundary and uncertainty claims. Review manually before copying into `BOUNDARIES.md`.",
    "",
    "## Explicit Boundaries",
    "",
    ...formatClaimList(boundaryClaims),
    "",
    "## Uncertainty Boundaries",
    "",
    ...formatClaimList(uncertaintyClaims),
    ""
  ].join("\n");
}

function formatClaimList(claims) {
  if (claims.length === 0) {
    return ["- No claims available."];
  }

  return claims.flatMap((claim) => [
    `- **${claim.id}** (${claim.type}, ${claim.confidence}): ${claim.text}`,
    `  Evidence: ${formatEvidence(claim)}`
  ]);
}

function formatEvidence(claim) {
  if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
    return `sources: ${(claim.source_ids ?? []).join(", ") || "none"}`;
  }

  return claim.evidence
    .map((evidence) => `${evidence.source_id}${evidence.location ? ` @ ${evidence.location}` : ""}`)
    .join("; ");
}
