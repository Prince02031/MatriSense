import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import EmbeddingClient from "../src/vectorRag/core/embeddingClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

process.env.EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "local";
process.env.EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "Xenova/multilingual-e5-small";
process.env.EMBEDDING_DIMENSIONS = process.env.EMBEDDING_DIMENSIONS || "384";

const client = new EmbeddingClient({
  provider: "local",
  model: process.env.EMBEDDING_MODEL,
  dimensions: Number(process.env.EMBEDDING_DIMENSIONS),
});

const query = "pregnancy severe headache and blurred vision danger sign";
const result = await client.embed(query, { inputType: "query" });

if (!result.ok) {
  console.error("Embedding failed:", result.error || result.message);
  process.exit(1);
}

console.log("provider:", result.provider);
console.log("model:", result.model);
console.log("dimensions:", result.dimensions);
console.log("first8:", result.embedding.slice(0, 8));

if (result.dimensions !== 384) {
  console.error(`Expected dimensions=384, got ${result.dimensions}`);
  process.exit(1);
}

console.log("Local embedding test passed.");
