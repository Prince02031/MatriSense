#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const VectorKnowledgeChunk = require('../models/VectorKnowledgeChunk');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MongoDB connected: no');
    console.log('Reason: MONGODB_URI missing');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const total = await VectorKnowledgeChunk.countDocuments();
  const withEmbedding = await VectorKnowledgeChunk.countDocuments({ embedding: { $exists: true, $ne: null } });
  const withLocal = await VectorKnowledgeChunk.countDocuments({ embeddingProvider: 'local' });
  const with384 = await VectorKnowledgeChunk.countDocuments({ embeddingDimensions: 384 });
  const patientAudience = await VectorKnowledgeChunk.countDocuments({ audience: 'PATIENT' });
  const highRisk = await VectorKnowledgeChunk.countDocuments({ riskLevelAllowed: 'HIGH' });
  const warningTypes = await VectorKnowledgeChunk.countDocuments({ guidanceTypes: { $in: ['WARNING_SIGNS', 'URGENT_ESCALATION'] } });
  const sample = await VectorKnowledgeChunk.findOne().lean();

  console.log('MongoDB connected: yes');
  console.log(`VectorKnowledgeChunk collection: ${VectorKnowledgeChunk.collection.collectionName}`);
  console.log(`total vector chunks: ${total}`);
  console.log(`chunks with embedding: ${withEmbedding}`);
  console.log(`chunks with embeddingProvider=local: ${withLocal}`);
  console.log(`chunks with embeddingDimensions=384: ${with384}`);
  console.log(`chunks with PATIENT audience: ${patientAudience}`);
  console.log(`chunks with HIGH riskLevelAllowed: ${highRisk}`);
  console.log(`chunks with WARNING_SIGNS/URGENT_ESCALATION: ${warningTypes}`);
  console.log(`expected vector index name: ${process.env.VECTOR_INDEX_NAME || 'vector_index'}`);
  console.log(`embedding model env: ${process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small'}`);
  if (sample) {
    console.log('sample chunk metadata:');
    console.log(JSON.stringify({
      chunkId: sample.chunkId,
      sourceId: sample.sourceId,
      sourceKind: sample.sourceKind,
      audience: sample.audience,
      riskLevelAllowed: sample.riskLevelAllowed,
      guidanceTypes: sample.guidanceTypes,
      evidenceTags: sample.evidenceTags?.slice(0, 8),
      symptoms: sample.symptoms?.slice(0, 8),
      embeddingProvider: sample.embeddingProvider,
      embeddingModel: sample.embeddingModel,
      embeddingDimensions: sample.embeddingDimensions,
      embeddingLength: Array.isArray(sample.embedding) ? sample.embedding.length : 0,
    }, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('diagnose failed:', error.message);
  try { await mongoose.disconnect(); } catch (e) {}
  process.exit(1);
});
