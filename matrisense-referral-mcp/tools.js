const { patientToolsDef, handlePatientTool } = require('./patientTools');
const { workerToolsDef, handleWorkerTool } = require('./workerTools');

function getToolsList() {
    return [...patientToolsDef, ...workerToolsDef];
}

async function executeTool(name, args) {
    try {
        const isPatientTool = patientToolsDef.some(t => t.name === name);
        const isWorkerTool = workerToolsDef.some(t => t.name === name);

        if (isPatientTool) {
            if (!args.patientId && name !== 'referral_find_hospital_options' && name !== 'referral_get_hospital_details') {
                return { content: [{ type: "text", text: JSON.stringify({ error: "Missing patientId for patient tool." }) }] };
            }
            const response = await handlePatientTool(name, args);
            return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
        }

        if (isWorkerTool) {
            if (!args.workerId) {
                return { content: [{ type: "text", text: JSON.stringify({ error: "Missing workerId for worker tool." }) }] };
            }
            const response = await handleWorkerTool(name, args);
            return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
        }

        return { content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] };
    } catch (error) {
        return {
            content: [{ type: "text", text: JSON.stringify({ error: error.message, stack: undefined }) }],
            isError: true
        }; // Note: We do not expose stack traces as per prompt constraints
    }
}

module.exports = { getToolsList, executeTool };
