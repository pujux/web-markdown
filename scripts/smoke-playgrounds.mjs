import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new AssertionError(message);
  }
}

function headerIncludes(headers, name, token) {
  const value = headers.get(name);
  if (!value) {
    return false;
  }

  return value.toLowerCase().includes(token.toLowerCase());
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function renderCmd(command, args) {
  return [command, ...args].join(" ");
}

function createProcessRunner(name, command, args) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = [];
  const capture = (chunk) => {
    const text = chunk.toString();
    output.push(text);
    if (output.length > 120) {
      output.shift();
    }
  };

  child.stdout.on("data", capture);
  child.stderr.on("data", capture);

  return {
    child,
    name,
    command: renderCmd(command, args),
    getOutput() {
      return output.join("");
    },
  };
}

async function waitForHttpReady(baseUrl, timeoutMs = 60_000) {
  const startedAt = Date.now();
  const probeTargets = [baseUrl, new URL("/", baseUrl).toString()];

  while (Date.now() - startedAt < timeoutMs) {
    for (const target of probeTargets) {
      try {
        const response = await fetchWithTimeout(
          target,
          {
            headers: { Accept: "text/html,*/*;q=0.8" },
            redirect: "manual",
          },
          3_000,
        );
        if (response.status >= 200 && response.status < 600) {
          return;
        }
      } catch {
        // continue probing
      }
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function stopProcess(runner) {
  const { child } = runner;
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  const exited = await Promise.race([
    once(child, "exit").then(() => true),
    sleep(5_000).then(() => false),
  ]);

  if (!exited) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

async function runPlayground(name, startArgs, baseUrl, checks) {
  const runner = createProcessRunner(name, "pnpm", startArgs);

  try {
    await waitForHttpReady(baseUrl);
    for (const check of checks) {
      await check(baseUrl);
    }
    console.log(`PASS ${name}`);
  } catch (error) {
    const output = runner.getOutput();
    const reason =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : `Unknown error: ${String(error)}`;
    console.error(`FAIL ${name}`);
    console.error(`Command: ${runner.command}`);
    console.error(reason);
    if (output.trim()) {
      console.error("---- process output (tail) ----");
      console.error(output.trimEnd());
    }
    throw error;
  } finally {
    await stopProcess(runner);
  }
}

async function checkHtmlAdapter(baseUrl, adapterName) {
  const markdown = await fetchWithTimeout(`${baseUrl}/guide`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(markdown.status === 200, `${adapterName} /guide markdown should be 200`);
  assert(
    headerIncludes(markdown.headers, "content-type", "text/markdown"),
    `${adapterName} /guide markdown should return text/markdown`,
  );
  assert(
    markdown.headers.get("x-markdown-transformed") === "1",
    `${adapterName} /guide markdown should set X-Markdown-Transformed: 1`,
  );
  assert(
    headerIncludes(markdown.headers, "vary", "accept"),
    `${adapterName} /guide markdown should include Vary: Accept`,
  );

  const excluded = await fetchWithTimeout(`${baseUrl}/not-markdown`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(excluded.status === 200, `${adapterName} /not-markdown should be 200`);
  assert(
    headerIncludes(excluded.headers, "content-type", "text/html"),
    `${adapterName} /not-markdown should stay html`,
  );
  assert(
    excluded.headers.get("x-markdown-transformed") === "0",
    `${adapterName} /not-markdown should set X-Markdown-Transformed: 0`,
  );

  const nonHtml = await fetchWithTimeout(`${baseUrl}/json`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(nonHtml.status === 200, `${adapterName} /json should be 200`);
  assert(
    headerIncludes(nonHtml.headers, "content-type", "application/json"),
    `${adapterName} /json should remain json`,
  );

  const redirect = await fetchWithTimeout(`${baseUrl}/redirect`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(redirect.status === 302, `${adapterName} /redirect should return 302`);
}

async function checkExpress(baseUrl) {
  await checkHtmlAdapter(baseUrl, "express");
}

async function checkFastify(baseUrl) {
  await checkHtmlAdapter(baseUrl, "fastify");
}

async function checkKoa(baseUrl) {
  await checkHtmlAdapter(baseUrl, "koa");
}

async function checkNodeHttp(baseUrl) {
  await checkHtmlAdapter(baseUrl, "node-http");
}

async function checkNextAppRouter(baseUrl) {
  const markdown = await fetchWithTimeout(`${baseUrl}/rich`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(markdown.status === 200, "next-app /rich markdown should be 200");
  assert(
    headerIncludes(markdown.headers, "content-type", "text/markdown"),
    "next-app /rich markdown should return text/markdown",
  );
  assert(
    markdown.headers.get("x-markdown-transformed") === "1",
    "next-app /rich markdown should set X-Markdown-Transformed: 1",
  );
  assert(
    headerIncludes(markdown.headers, "vary", "accept"),
    "next-app /rich markdown should include Vary: Accept",
  );

  const excluded = await fetchWithTimeout(`${baseUrl}/not-markdown`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(excluded.status === 200, "next-app /not-markdown should be 200");
  assert(
    headerIncludes(excluded.headers, "content-type", "text/html"),
    "next-app /not-markdown should stay html",
  );
  assert(
    excluded.headers.get("x-markdown-transformed") === "0",
    "next-app /not-markdown should set X-Markdown-Transformed: 0",
  );

  const file = await fetchWithTimeout(`${baseUrl}/file`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(file.status === 200, "next-app /file should be 200");
  assert(
    headerIncludes(file.headers, "content-type", "text/csv"),
    "next-app /file should stay csv",
  );
  assert(
    file.headers.get("x-markdown-transformed") === "0",
    "next-app /file should set X-Markdown-Transformed: 0",
  );

  const directInternal = await fetchWithTimeout(`${baseUrl}/api/web-markdown?wmsource=%2Frich`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(directInternal.status === 404, "next-app direct internal endpoint should return 404");
}

async function checkNextPagesRouter(baseUrl) {
  const markdown = await fetchWithTimeout(`${baseUrl}/rich`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(markdown.status === 200, "next-pages /rich markdown should be 200");
  assert(
    headerIncludes(markdown.headers, "content-type", "text/markdown"),
    "next-pages /rich markdown should return text/markdown",
  );
  assert(
    markdown.headers.get("x-markdown-transformed") === "1",
    "next-pages /rich markdown should set X-Markdown-Transformed: 1",
  );
  assert(
    headerIncludes(markdown.headers, "vary", "accept"),
    "next-pages /rich markdown should include Vary: Accept",
  );

  const excluded = await fetchWithTimeout(`${baseUrl}/not-markdown`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(excluded.status === 200, "next-pages /not-markdown should be 200");
  assert(
    headerIncludes(excluded.headers, "content-type", "text/html"),
    "next-pages /not-markdown should stay html",
  );
  assert(
    excluded.headers.get("x-markdown-transformed") === "0",
    "next-pages /not-markdown should set X-Markdown-Transformed: 0",
  );

  const file = await fetchWithTimeout(`${baseUrl}/file`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(file.status === 200, "next-pages /file should be 200");
  assert(
    headerIncludes(file.headers, "content-type", "text/csv"),
    "next-pages /file should stay csv",
  );
  assert(
    file.headers.get("x-markdown-transformed") === "0",
    "next-pages /file should set X-Markdown-Transformed: 0",
  );

  const directInternal = await fetchWithTimeout(`${baseUrl}/api/web-markdown?wmsource=%2Frich`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert(directInternal.status === 404, "next-pages direct internal endpoint should return 404");
}

async function main() {
  await runPlayground(
    "playground-express",
    ["--filter", "@web-markdown/playground-express", "start"],
    "http://localhost:3001",
    [checkExpress],
  );

  await runPlayground(
    "playground-fastify",
    ["--filter", "@web-markdown/playground-fastify", "start"],
    "http://localhost:3004",
    [checkFastify],
  );

  await runPlayground(
    "playground-koa",
    ["--filter", "@web-markdown/playground-koa", "start"],
    "http://localhost:3005",
    [checkKoa],
  );

  await runPlayground(
    "playground-node-http",
    ["--filter", "@web-markdown/playground-node-http", "start"],
    "http://localhost:3006",
    [checkNodeHttp],
  );

  await runPlayground(
    "playground-next-app-router",
    ["--filter", "@web-markdown/playground-next-app-router", "dev"],
    "http://localhost:3002",
    [checkNextAppRouter],
  );

  await runPlayground(
    "playground-next-pages-router",
    ["--filter", "@web-markdown/playground-next-pages-router", "dev"],
    "http://localhost:3003",
    [checkNextPagesRouter],
  );

  console.log("All playground smoke tests passed.");
}

await main();
