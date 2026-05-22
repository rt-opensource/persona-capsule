const SOURCE_REQUIRED_FIELDS = [
  "id",
  "path",
  "type",
  "bytes",
  "hash",
  "sensitivity",
  "owner",
  "imported_at",
  "modified_at",
  "status"
];

const SOURCE_TYPES = new Set(["markdown", "text", "json", "jsonl", "csv", "html", "pdf", "docx", "subtitle", "unknown"]);
const SOURCE_STATUSES = new Set(["indexed", "excluded", "review-required"]);

const CLAIM_REQUIRED_FIELDS = ["id", "type", "text", "confidence", "source_ids", "created_at"];
const CLAIM_TYPES = new Set(["fact", "preference", "value", "style", "relationship", "boundary", "inference"]);
const CLAIM_CONFIDENCES = new Set(["verified", "corroborated", "inferred", "stylistic", "unknown"]);

const CAPSULE_MODES = new Set(["self-continuity", "memorial", "public-figure", "fictional"]);
const CONSENT_STATUSES = new Set(["self-authorized", "authorized-by-estate", "public-sources-only", "fictional", "unknown"]);
const EXPORT_TARGETS = new Set(["hermes", "openclaw", "openhands", "codex", "claude-code"]);
const CAPSULE_REQUIRED_FIELDS = ["id", "version", "subject", "mode", "consent", "export_targets"];

export function validateCapsuleManifest(rawManifest) {
  const { manifest, errors } = parseCapsuleManifest(rawManifest);
  if (errors.length > 0) {
    return errors;
  }

  for (const field of CAPSULE_REQUIRED_FIELDS) {
    if (!(field in manifest)) {
      errors.push(`${field} is required`);
    }
  }

  if ("id" in manifest && (!isNonEmptyString(manifest.id) || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.id))) {
    errors.push("id must match ^[a-z0-9][a-z0-9-]*$");
  }

  if ("version" in manifest && !isNonEmptyString(manifest.version)) {
    errors.push("version must be a non-empty string");
  }

  if (!isObject(manifest.subject)) {
    if ("subject" in manifest) {
      errors.push("subject must be an object");
    }
  } else if (!isNonEmptyString(manifest.subject.display_name)) {
    errors.push("subject.display_name is required");
  }

  if ("mode" in manifest && !CAPSULE_MODES.has(manifest.mode)) {
    errors.push(`mode must be one of ${formatAllowed(CAPSULE_MODES)}`);
  }

  if (!isObject(manifest.consent)) {
    if ("consent" in manifest) {
      errors.push("consent must be an object");
    }
  } else if (!CONSENT_STATUSES.has(manifest.consent.status)) {
    errors.push(`consent.status must be one of ${formatAllowed(CONSENT_STATUSES)}`);
  }

  if ("export_targets" in manifest) {
    if (!Array.isArray(manifest.export_targets)) {
      errors.push("export_targets must be an array");
    } else {
      const seen = new Set();
      for (const [targetIndex, target] of manifest.export_targets.entries()) {
        if (!EXPORT_TARGETS.has(target)) {
          errors.push(`export_targets[${targetIndex}] must be one of ${formatAllowed(EXPORT_TARGETS)}`);
        } else if (seen.has(target)) {
          errors.push(`export_targets[${targetIndex}] duplicates ${target}`);
        } else {
          seen.add(target);
        }
      }
    }
  }

  return errors;
}

export function validateSourceIndex(index) {
  const errors = [];

  if (!isObject(index)) {
    return ["source-index.json must be a JSON object"];
  }

  if (!Array.isArray(index.sources)) {
    return ["sources must be an array"];
  }

  const ids = new Set();
  for (const [indexPosition, source] of index.sources.entries()) {
    const prefix = `sources[${indexPosition}]`;

    if (!isObject(source)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }

    for (const field of SOURCE_REQUIRED_FIELDS) {
      if (!(field in source)) {
        errors.push(`${prefix}.${field} is required`);
      }
    }

    if ("id" in source) {
      if (!isNonEmptyString(source.id)) {
        errors.push(`${prefix}.id must be a non-empty string`);
      } else if (ids.has(source.id)) {
        errors.push(`${prefix}.id duplicates ${source.id}`);
      } else {
        ids.add(source.id);
      }
    }

    if ("path" in source && !isPortablePath(source.path)) {
      errors.push(`${prefix}.path must be a portable relative path`);
    }

    if ("type" in source && !SOURCE_TYPES.has(source.type)) {
      errors.push(`${prefix}.type must be a known source type`);
    }

    if ("bytes" in source && (!Number.isInteger(source.bytes) || source.bytes < 0)) {
      errors.push(`${prefix}.bytes must be a non-negative integer`);
    }

    if ("hash" in source && (!isNonEmptyString(source.hash) || !/^[a-f0-9]{64}$/.test(source.hash))) {
      errors.push(`${prefix}.hash must be a lowercase sha256 hex digest`);
    }

    for (const field of ["sensitivity", "owner"]) {
      if (field in source && !isNonEmptyString(source[field])) {
        errors.push(`${prefix}.${field} must be a non-empty string`);
      }
    }

    for (const field of ["imported_at", "modified_at"]) {
      if (field in source && !isIsoDateTime(source[field])) {
        errors.push(`${prefix}.${field} must be an ISO date-time string`);
      }
    }

    if ("status" in source && !SOURCE_STATUSES.has(source.status)) {
      errors.push(`${prefix}.status must be indexed, excluded, or review-required`);
    }
  }

  return errors;
}

export function parseCapsuleManifest(rawManifest) {
  const manifest = {};
  const errors = [];
  let activeKey;

  for (const [lineIndex, rawLine] of rawManifest.split(/\r?\n/).entries()) {
    const lineNumber = lineIndex + 1;
    const withoutComment = stripYamlComment(rawLine);
    if (withoutComment.trim() === "") {
      continue;
    }

    const indent = rawLine.match(/^ */)[0].length;
    const line = withoutComment.trim();

    if (indent === 0) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/);
      if (!match) {
        errors.push(`line ${lineNumber} must be a key-value pair`);
        continue;
      }

      const [, key, rawValue] = match;
      const value = rawValue.trim();
      if (value === "") {
        manifest[key] = {};
        activeKey = key;
      } else {
        manifest[key] = normalizeYamlScalar(value);
        activeKey = undefined;
      }
      continue;
    }

    if (indent !== 2 || !activeKey) {
      errors.push(`line ${lineNumber} uses unsupported indentation`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!Array.isArray(manifest[activeKey])) {
        manifest[activeKey] = [];
      }
      manifest[activeKey].push(normalizeYamlScalar(line.slice(2).trim()));
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/);
    if (!match) {
      errors.push(`line ${lineNumber} must be a nested key-value pair`);
      continue;
    }

    const [, key, rawValue] = match;
    if (Array.isArray(manifest[activeKey])) {
      errors.push(`line ${lineNumber} cannot mix list and object values`);
      continue;
    }

    manifest[activeKey][key] = normalizeYamlScalar(rawValue.trim());
  }

  return { manifest, errors };
}

function stripYamlComment(line) {
  let quote;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === "\"" || character === "'") && line[index - 1] !== "\\") {
      quote = quote === character ? undefined : quote ?? character;
    }

    if (character === "#" && !quote) {
      return line.slice(0, index);
    }
  }

  return line;
}

function normalizeYamlScalar(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function formatAllowed(values) {
  return [...values].join(", ");
}

export function validateClaimsJsonl(rawClaims, sourceIds) {
  const errors = [];
  const knownSourceIds = new Set(sourceIds);

  for (const [lineIndex, line] of rawClaims.split(/\r?\n/).entries()) {
    const lineNumber = lineIndex + 1;
    if (line.trim() === "") {
      continue;
    }

    let claim;
    try {
      claim = JSON.parse(line);
    } catch {
      errors.push(`claims.jsonl:${lineNumber} must be valid JSON`);
      continue;
    }

    errors.push(...validateClaim(claim, knownSourceIds, lineNumber));
  }

  return errors;
}

function validateClaim(claim, knownSourceIds, lineNumber) {
  const errors = [];
  const prefix = `claims.jsonl:${lineNumber}`;

  if (!isObject(claim)) {
    return [`${prefix} claim must be an object`];
  }

  for (const field of CLAIM_REQUIRED_FIELDS) {
    if (!(field in claim)) {
      errors.push(`${prefix} ${field} is required`);
    }
  }

  if ("id" in claim && !isNonEmptyString(claim.id)) {
    errors.push(`${prefix} id must be a non-empty string`);
  }

  if ("type" in claim && !CLAIM_TYPES.has(claim.type)) {
    errors.push(`${prefix} type must be a known claim type`);
  }

  if ("text" in claim && !isNonEmptyString(claim.text)) {
    errors.push(`${prefix} text must be a non-empty string`);
  }

  if ("confidence" in claim && !CLAIM_CONFIDENCES.has(claim.confidence)) {
    errors.push(`${prefix} confidence must be a known confidence value`);
  }

  if ("source_ids" in claim) {
    if (!Array.isArray(claim.source_ids)) {
      errors.push(`${prefix} source_ids must be an array`);
    } else if (claim.source_ids.length === 0) {
      errors.push(`${prefix} source_ids must contain at least one source id`);
    } else {
      for (const [sourceIndex, sourceId] of claim.source_ids.entries()) {
        if (!isNonEmptyString(sourceId)) {
          errors.push(`${prefix} source_ids[${sourceIndex}] must be a non-empty string`);
        } else if (!knownSourceIds.has(sourceId)) {
          errors.push(`${prefix} source_ids[${sourceIndex}] references unknown source ${sourceId}`);
        }
      }
    }
  }

  if ("evidence" in claim) {
    if (!Array.isArray(claim.evidence)) {
      errors.push(`${prefix} evidence must be an array`);
    } else {
      for (const [evidenceIndex, evidence] of claim.evidence.entries()) {
        if (!isObject(evidence)) {
          errors.push(`${prefix} evidence[${evidenceIndex}] must be an object`);
          continue;
        }

        if (!isNonEmptyString(evidence.source_id)) {
          errors.push(`${prefix} evidence[${evidenceIndex}].source_id is required`);
        } else if (!knownSourceIds.has(evidence.source_id)) {
          errors.push(`${prefix} evidence[${evidenceIndex}].source_id references unknown source ${evidence.source_id}`);
        }
      }
    }
  }

  if ("created_at" in claim && !isIsoDateTime(claim.created_at)) {
    errors.push(`${prefix} created_at must be an ISO date-time string`);
  }

  return errors;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isIsoDateTime(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isPortablePath(value) {
  return isNonEmptyString(value) && !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes("..");
}
