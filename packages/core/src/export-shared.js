export function appendRuntimeGuidance(artifact, runtimeName, bullets) {
  return [
    artifact.trim(),
    "",
    `## ${runtimeName} Runtime Guidance`,
    "",
    ...bullets,
    ""
  ].join("\n");
}

export function buildMemoryReadme(displayName, runtimeName) {
  return [
    `# ${runtimeName} Runtime Memory Proposals: ${displayName}`,
    "",
    `${runtimeName} runtime memory proposals belong here.`,
    "",
    "Use this directory for session notes, proposed memory deltas, rejected memory records, and review artifacts. Do not overwrite `claims.jsonl`; it is generated from the canonical capsule.",
    ""
  ].join("\n");
}

export function buildClaimSummary(claims, runtimeName) {
  return [
    "# Claim Summary",
    "",
    `Generated from evidence-backed Persona Capsule claims for ${runtimeName} runtime review.`,
    "",
    "## Claims",
    "",
    ...formatClaimList(claims),
    ""
  ].join("\n");
}

export function formatClaimList(claims) {
  if (claims.length === 0) {
    return ["- No claims available."];
  }

  return claims.map((claim) => `- **${claim.id}** (${claim.type}, ${claim.confidence}): ${claim.text}`);
}
