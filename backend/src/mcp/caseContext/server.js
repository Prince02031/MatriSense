require('dotenv').config();
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const express = require('express');
const z = require('zod');
const mongoose = require('mongoose');

const {
    getTriageProfileContext,
    getCurrentTriage,
    getGuidedCareContext,
    getRecentTriageHistory,
    getPatientVisibleStatus,
    getHealthWorkerCaseSummary,
    getDocumentAnalyses
} = require('./services/caseContextService');

const logOperation = (tool, requesterRole, targetId, status) => {
    console.error(`[MCP] Tool: ${tool} | Requester: ${requesterRole || 'UNKNOWN'} | Target: ${targetId} | Status: ${status}`);
};

const RequesterSchema = z.object({
    id: z.string().optional(),
    role: z.enum(["PATIENT", "HEALTH_WORKER", "ADMIN", "INTERNAL"]).optional()
});

const schemas = {
    case_get_triage_profile_context: z.object({
        patientId: z.string(),
        sessionId: z.string().optional(),
        requester: RequesterSchema.optional()
    }),
    case_get_current_triage: z.object({
        sessionId: z.string(),
        requester: RequesterSchema.optional()
    }),
    case_get_guided_care_context: z.object({
        sessionId: z.string(),
        patientId: z.string().optional(),
        requester: RequesterSchema.optional()
    }),
    case_get_recent_triage_history: z.object({
        patientId: z.string(),
        limit: z.number().optional(),
        requester: RequesterSchema.optional()
    }),
    case_get_patient_visible_status: z.object({
        sessionId: z.string(),
        requester: RequesterSchema.optional()
    }),
    case_get_health_worker_case_summary: z.object({
        sessionId: z.string(),
        requester: z.object({
            id: z.string(),
            role: z.enum(["HEALTH_WORKER", "ADMIN"])
        })
    }),
    case_analyze_medical_document: z.object({
        documentId: z.string().optional(),
        patientId: z.string().optional(),
        sessionId: z.string().optional(),
        limit: z.number().optional(),
        requester: RequesterSchema.optional()
    }).refine(d => d.documentId || d.patientId || d.sessionId, {
        message: "One of documentId, patientId, or sessionId is required"
    })
};

const mcpServer = new Server({ name: "matrisense-case-context-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "case_get_triage_profile_context",
                description: "Returns sanitized patient history and pregnancy profile.",
                inputSchema: { type: "object", properties: { patientId: { type: "string" }, sessionId: { type: "string" }, requester: { type: "object" } }, required: ["patientId"] }
            },
            {
                name: "case_get_current_triage",
                description: "Returns current triage state, symptoms and guidance.",
                inputSchema: { type: "object", properties: { sessionId: { type: "string" }, requester: { type: "object" } }, required: ["sessionId"] }
            },
            {
                name: "case_get_guided_care_context",
                description: "Used by Guided Care Assistant to retrieve safe assistant context including boundaries.",
                inputSchema: { type: "object", properties: { sessionId: { type: "string" }, patientId: { type: "string" }, requester: { type: "object" } }, required: ["sessionId"] }
            },
            {
                name: "case_get_recent_triage_history",
                description: "Returns safe summaries of up to 3 past triages.",
                inputSchema: { type: "object", properties: { patientId: { type: "string" }, limit: { type: "number" }, requester: { type: "object" } }, required: ["patientId"] }
            },
            {
                name: "case_get_patient_visible_status",
                description: "Returns patient-visible case status and referral visibility.",
                inputSchema: { type: "object", properties: { sessionId: { type: "string" }, requester: { type: "object" } }, required: ["sessionId"] }
            },
            {
                name: "case_get_health_worker_case_summary",
                description: "Returns detailed worker-only fields.",
                inputSchema: { type: "object", properties: { sessionId: { type: "string" }, requester: { type: "object", properties: { id: { type: "string" }, role: { type: "string" } }, required: ["id", "role"] } }, required: ["sessionId", "requester"] }
            },
            {
                name: "case_analyze_medical_document",
                description: "Returns already-extracted Gemini Vision analysis (values, severity flags, summary) for a mother's uploaded medical document(s) — a specific document by documentId, or the most recently analyzed documents for a patientId/sessionId. Does not re-run analysis.",
                inputSchema: { type: "object", properties: { documentId: { type: "string" }, patientId: { type: "string" }, sessionId: { type: "string" }, limit: { type: "number" }, requester: { type: "object" } } }
            }
        ]
    };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request;

    try {
        let result;
        let pIdLog = args.sessionId || args.patientId || 'unknown';
        let roleLog = args.requester?.role || 'UNKNOWN';

        if (name === 'case_get_triage_profile_context') {
            const parsed = schemas.case_get_triage_profile_context.parse(args);
            pIdLog = parsed.patientId;
            roleLog = parsed.requester?.role || 'UNKNOWN';
            const data = await getTriageProfileContext(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else if (name === 'case_get_current_triage') {
            const parsed = schemas.case_get_current_triage.parse(args);
            const data = await getCurrentTriage(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else if (name === 'case_get_guided_care_context') {
            const parsed = schemas.case_get_guided_care_context.parse(args);
            const data = await getGuidedCareContext(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else if (name === 'case_get_recent_triage_history') {
            const parsed = schemas.case_get_recent_triage_history.parse(args);
            pIdLog = parsed.patientId;
            roleLog = parsed.requester?.role || 'UNKNOWN';
            const data = await getRecentTriageHistory(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else if (name === 'case_get_patient_visible_status') {
            const parsed = schemas.case_get_patient_visible_status.parse(args);
            const data = await getPatientVisibleStatus(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else if (name === 'case_get_health_worker_case_summary') {
            const parsed = schemas.case_get_health_worker_case_summary.parse(args);
            roleLog = parsed.requester.role;
            const data = await getHealthWorkerCaseSummary(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else if (name === 'case_analyze_medical_document') {
            const parsed = schemas.case_analyze_medical_document.parse(args);
            pIdLog = parsed.documentId || parsed.sessionId || parsed.patientId;
            roleLog = parsed.requester?.role || 'UNKNOWN';
            const data = await getDocumentAnalyses(parsed);
            if (!data) throw new Error("Context unavailable or access denied");
            result = data;
        } else {
            throw new Error(`Unknown tool: ${name}`);
        }

        logOperation(name, roleLog, pIdLog, 'SUCCESS');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
        let safeMsg = "An error occurred retrieving context";
        if (e instanceof z.ZodError) {
            safeMsg = "Validation failed: " + e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        } else if (e.message.includes("unavailable or access")) {
            safeMsg = e.message;
        }

        // Log failure explicitly without stack traces
        const pIdLog = args?.sessionId || args?.patientId || 'unknown';
        const roleLog = args?.requester?.role || 'UNKNOWN';
        logOperation(name, roleLog, pIdLog, 'FAILED');
        console.error(`[MCP ERROR] ${safeMsg}`);

        return { content: [{ type: "text", text: JSON.stringify({ error: safeMsg }) }], isError: true };
    }
});

const startStdio = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error("MONGODB_URI not set. Exiting.");
        process.exit(1);
    }
    await mongoose.connect(uri);
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("MatriSense Case Context MCP Server running on stdio");
};

// If ran directly with --stdio
if (require.main === module && process.argv.includes('--stdio')) {
    startStdio().catch(console.error);
}

module.exports = { mcpServer };
