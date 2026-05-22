const CLAIM_BLOCK_PATTERN = /<!--\s*persona-claim\s*([\s\S]*?)\s*-->/g;

export function extractClaimsFromIndexedSources(sourceDocuments) {
  const errors = [];
  const claimsById = new Map();

  for (const { source, text } of sourceDocuments) {
    const blocks = parseClaimBlocks(source, text, errors);
    for (const block of blocks) {
      mergeClaimBlock(claimsById, block, source, errors);
    }
  }

  const claims = [...claimsById.values()]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((claim) => ({
      id: claim.id,
      type: claim.type,
      text: claim.text,
      confidence: claim.confidence,
      source_ids: claim.sourceIds,
      evidence: claim.evidence,
      created_at: claim.createdAt
    }));

  if (claims.length === 0) {
    errors.push("no persona-claim blocks found in indexed sources");
  }

  return { claims, errors };
}

export function formatClaimsJsonl(claims) {
  return `${claims.map((claim) => JSON.stringify(claim)).join("\n")}\n`;
}

function parseClaimBlocks(source, text, errors) {
  const blocks = [];

  for (const match of text.matchAll(CLAIM_BLOCK_PATTERN)) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      errors.push(`${source.path} contains an invalid persona-claim JSON block`);
    }
  }

  return blocks;
}

function mergeClaimBlock(claimsById, block, source, errors) {
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    errors.push(`${source.path} contains a persona-claim block that is not an object`);
    return;
  }

  if (!isNonEmptyString(block.id)) {
    errors.push(`${source.path} contains a persona-claim block without id`);
    return;
  }

  const existing = claimsById.get(block.id);
  const claim = existing ?? createClaim(block, source);
  if (existing) {
    for (const field of ["type", "text", "confidence", "createdAt"]) {
      const incoming = field === "createdAt" ? block.created_at : block[field];
      if (incoming !== undefined && claim[field] !== incoming) {
        errors.push(`${source.path} conflicts with earlier ${block.id} ${field}`);
      }
    }
  }

  if (!claim.sourceIds.includes(source.id)) {
    claim.sourceIds.push(source.id);
  }

  if (Array.isArray(block.evidence)) {
    for (const evidence of block.evidence) {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
        errors.push(`${source.path} ${block.id} evidence entry must be an object`);
        continue;
      }

      claim.evidence.push({
        source_id: source.id,
        quote: evidence.quote,
        location: evidence.location
      });
    }
  }

  claimsById.set(block.id, claim);
}

function createClaim(block, source) {
  return {
    id: block.id,
    order: Number.isFinite(block.order) ? block.order : Number.MAX_SAFE_INTEGER,
    type: block.type,
    text: block.text,
    confidence: block.confidence,
    sourceIds: [],
    evidence: [],
    createdAt: block.created_at ?? source.imported_at
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
