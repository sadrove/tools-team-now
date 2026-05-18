import { writeFile } from "node:fs/promises";
import { createOpenApiDocument } from "../src/openapi.js";

const baseUrl = process.env.API_BASE_URL ?? "https://tools-team-now.toolsteamnow.workers.dev";
const outputPath = new URL("../openapi.json", import.meta.url);
const document = createOpenApiDocument(baseUrl);

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.error(`Wrote ${outputPath.pathname} with server ${baseUrl}`);
