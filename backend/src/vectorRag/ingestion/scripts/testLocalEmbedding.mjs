import { pipeline } from "@huggingface/transformers";

const modelName = process.env.EMBEDDING_MODEL || "Xenova/multilingual-e5-small";

console.log("Loading model:", modelName);

const extractor = await pipeline("feature-extraction", modelName);

const text = "query: pregnancy severe headache and blurred vision danger sign";

const output = await extractor(text, {
  pooling: "mean",
  normalize: true,
});

const embedding = Array.from(output.data);

console.log("Embedding dimensions:", embedding.length);
console.log("First 8 values:", embedding.slice(0, 8));