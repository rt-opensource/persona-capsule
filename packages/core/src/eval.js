const BOUNDARY_HINTS = ["boundary", "continuity", "conscious", "same person", "fictional", "private intimacy"];

export function runCapsuleEval({ rawKnownAnswerTests, corpus, displayPath = "eval/known-answer-tests.jsonl" }) {
  const parsed = parseKnownAnswerTestsJsonl(rawKnownAnswerTests, displayPath);
  if (parsed.errors.length > 0) {
    return buildResult(parsed.errors, []);
  }

  const normalizedCorpus = normalizeText(corpus);
  const corpusTokens = new Set(tokenize(corpus));
  const results = parsed.tests.map((testCase) => evaluateKnownAnswerTest(testCase, normalizedCorpus, corpusTokens, displayPath));
  const errors = results.flatMap((result) => result.errors);
  if (!results.some((result) => result.boundary)) {
    errors.push(`${displayPath} must include at least one boundary or continuity test`);
  }

  return buildResult(errors, results);
}

function parseKnownAnswerTestsJsonl(rawKnownAnswerTests, displayPath) {
  const errors = [];
  const tests = [];

  for (const [lineIndex, line] of rawKnownAnswerTests.split(/\r?\n/).entries()) {
    const lineNumber = lineIndex + 1;
    if (line.trim() === "") {
      continue;
    }

    let testCase;
    try {
      testCase = JSON.parse(line);
    } catch {
      errors.push(`${displayPath}:${lineNumber} must be valid JSON`);
      continue;
    }

    const validationErrors = validateKnownAnswerTest(testCase, displayPath, lineNumber);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      continue;
    }

    tests.push({
      id: testCase.id,
      prompt: testCase.prompt,
      must_include: testCase.must_include,
      must_not_include: testCase.must_not_include,
      lineNumber,
      boundary: isBoundaryTest(testCase)
    });
  }

  if (tests.length === 0 && errors.length === 0) {
    errors.push(`${displayPath} must include at least one known-answer test`);
  }

  return { errors, tests };
}

function validateKnownAnswerTest(testCase, displayPath, lineNumber) {
  const errors = [];
  const prefix = `${displayPath}:${lineNumber}`;

  if (!isObject(testCase)) {
    return [`${prefix} test must be an object`];
  }

  for (const field of ["id", "prompt"]) {
    if (!isNonEmptyString(testCase[field])) {
      errors.push(`${prefix} ${field} must be a non-empty string`);
    }
  }

  for (const field of ["must_include", "must_not_include"]) {
    if (!(field in testCase)) {
      errors.push(`${prefix} ${field} is required`);
    } else if (!Array.isArray(testCase[field])) {
      errors.push(`${prefix} ${field} must be an array`);
    } else {
      for (const [termIndex, term] of testCase[field].entries()) {
        if (!isNonEmptyString(term)) {
          errors.push(`${prefix} ${field}[${termIndex}] must be a non-empty string`);
        }
      }
    }
  }

  return errors;
}

function evaluateKnownAnswerTest(testCase, normalizedCorpus, corpusTokens, displayPath) {
  const checks = [];
  const errors = [];
  const prefix = `${displayPath}:${testCase.lineNumber} ${testCase.id}`;

  for (const term of testCase.must_include) {
    const supported = isTermSupported(term, normalizedCorpus, corpusTokens);
    checks.push({ kind: "must_include", term, status: supported ? "passed" : "failed" });

    if (!supported) {
      errors.push(`${prefix} must_include "${term}" is not supported by canonical capsule materials`);
    }
  }

  for (const term of testCase.must_not_include) {
    const absent = !containsPhrase(normalizedCorpus, term);
    checks.push({ kind: "must_not_include", term, status: absent ? "passed" : "failed" });

    if (!absent) {
      errors.push(`${prefix} must_not_include "${term}" appears in canonical capsule materials`);
    }
  }

  return {
    id: testCase.id,
    line: testCase.lineNumber,
    boundary: testCase.boundary,
    status: errors.length === 0 ? "passed" : "failed",
    checks,
    errors
  };
}

function buildResult(errors, results) {
  const failed = results.filter((result) => result.status === "failed").length;
  const boundaryFailures = results
    .filter((result) => result.boundary && result.status === "failed")
    .flatMap((result) => result.errors);

  return {
    status: errors.length === 0 ? "passed" : "failed",
    summary: {
      total: results.length,
      passed: results.length - failed,
      failed,
      boundary: results.filter((result) => result.boundary).length
    },
    errors,
    boundaryFailures,
    results
  };
}

function isBoundaryTest(testCase) {
  const haystack = normalizeText([
    testCase.id,
    testCase.prompt,
    ...testCase.must_include,
    ...testCase.must_not_include
  ].join(" "));

  return BOUNDARY_HINTS.some((hint) => haystack.includes(hint));
}

function isTermSupported(term, normalizedCorpus, corpusTokens) {
  if (containsPhrase(normalizedCorpus, term)) {
    return true;
  }

  const tokens = tokenize(term);
  return tokens.length > 0 && tokens.every((token) => corpusTokens.has(token));
}

function containsPhrase(normalizedCorpus, term) {
  return normalizedCorpus.includes(normalizeText(term));
}

function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

function normalizeText(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
