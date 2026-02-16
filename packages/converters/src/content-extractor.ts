const PRIORITY_SELECTORS = ["main", "article", '[role="main"]', "#main", "#content", ".content"];
const STRUCTURAL_SELECTORS = ["article", "main", '[role="main"]', "section", "div"];
const CONTENT_NODE_SELECTORS = ["section", "div", "article", "aside", "nav", "header", "footer"];
const BOILERPLATE_HINT_PATTERN =
  /(nav|menu|footer|header|sidebar|breadcrumb|cookie|consent|promo|advert|social|share|related|subscribe|newsletter)/i;
const HIDDEN_STYLE_PATTERN = /(display\s*:\s*none|visibility\s*:\s*hidden)/i;

function normalizedText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function textLength(element: Element): number {
  return normalizedText(element.textContent).length;
}

function linkTextLength(element: Element): number {
  let total = 0;

  for (const link of element.querySelectorAll("a")) {
    total += normalizedText(link.textContent).length;
  }

  return total;
}

function linkDensity(element: Element): number {
  const totalText = textLength(element);
  if (totalText === 0) {
    return 1;
  }

  return linkTextLength(element) / totalText;
}

function hasBoilerplateHint(element: Element): boolean {
  if (BOILERPLATE_HINT_PATTERN.test(element.tagName)) {
    return true;
  }

  const className = element.getAttribute("class");
  if (className && BOILERPLATE_HINT_PATTERN.test(className)) {
    return true;
  }

  const id = element.getAttribute("id");
  if (id && BOILERPLATE_HINT_PATTERN.test(id)) {
    return true;
  }

  const role = element.getAttribute("role");
  if (role && BOILERPLATE_HINT_PATTERN.test(role)) {
    return true;
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && BOILERPLATE_HINT_PATTERN.test(ariaLabel)) {
    return true;
  }

  return false;
}

function scoreContentCandidate(element: Element): number {
  const plainTextLength = textLength(element);

  if (plainTextLength < 80) {
    return Number.NEGATIVE_INFINITY;
  }

  const paragraphCount = element.querySelectorAll("p").length;
  const headingCount = element.querySelectorAll("h1, h2, h3").length;
  const listCount = element.querySelectorAll("ul, ol").length;
  const tableCount = element.querySelectorAll("table").length;
  const preCount = element.querySelectorAll("pre").length;
  const density = linkDensity(element);

  let score = plainTextLength;
  score += paragraphCount * 120;
  score += headingCount * 70;
  score += listCount * 45;
  score += tableCount * 25;
  score += preCount * 25;
  score -= Math.round(density * 320);

  if (hasBoilerplateHint(element)) {
    score -= 350;
  }

  return score;
}

function removeHiddenNodes(root: Element | Document): void {
  for (const node of root.querySelectorAll('[hidden], [aria-hidden="true"]')) {
    node.remove();
  }

  for (const node of root.querySelectorAll("[style]")) {
    const style = node.getAttribute("style");
    if (!style || !HIDDEN_STYLE_PATTERN.test(style)) {
      continue;
    }

    node.remove();
  }
}

function pruneBoilerplateInside(root: Element): void {
  for (const node of root.querySelectorAll(CONTENT_NODE_SELECTORS.join(", "))) {
    if (!hasBoilerplateHint(node)) {
      continue;
    }

    const density = linkDensity(node);
    const length = textLength(node);
    const links = node.querySelectorAll("a").length;

    if (density >= 0.5 || links >= 4 || length < 220) {
      node.remove();
    }
  }
}

export function pickContentRoot(document: Document, minTextLength: number): Element {
  for (const selector of PRIORITY_SELECTORS) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }

    if (textLength(element) >= minTextLength) {
      return element;
    }
  }

  let bestElement: Element | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of document.querySelectorAll(STRUCTURAL_SELECTORS.join(", "))) {
    const score = scoreContentCandidate(candidate);
    if (score <= bestScore) {
      continue;
    }

    bestScore = score;
    bestElement = candidate;
  }

  if (bestElement && textLength(bestElement) >= minTextLength) {
    return bestElement;
  }

  return document.body ?? document.documentElement;
}

export function hardenContentTree(document: Document, root: Element): void {
  removeHiddenNodes(document);

  if (root !== document.body) {
    removeHiddenNodes(root);
  }

  pruneBoilerplateInside(root);
}
