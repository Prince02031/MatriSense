const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5000/api';
let patientToken = '';
let patientProfId = '';
let workerToken = '';
let docId1 = '';
let docId2 = '';

// Create dummy files
const pdfPath = path.join(__dirname, 'dummy.pdf');
const imgPath = path.join(__dirname, 'dummy.png');
const txtPath = path.join(__dirname, 'dummy.txt');
const largePath = path.join(__dirname, 'large.png');

fs.writeFileSync(pdfPath, 'dummy pdf content');
fs.writeFileSync(imgPath, 'dummy image content');
fs.writeFileSync(txtPath, 'dummy txt content');
const largeBuf = Buffer.alloc(6 * 1024 * 1024, 'a');
fs.writeFileSync(largePath, largeBuf);

async function req(method, endpoint, body = null, token = null, isFormData = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let data = body;
    if (isFormData && body) {
        data = new FormData();
        for (const [key, val] of Object.entries(body)) {
            if (key === 'file' && val) {
                data.append('file', fs.createReadStream(val));
            } else if (val !== undefined && val !== null) {
                data.append(key, val);
            }
        }
        Object.assign(headers, data.getHeaders());
    }

    try {
        const res = await axios({
            method,
            url: `${API_BASE}${endpoint}`,
            data,
            headers
        });
        return { status: res.status, data: res.data };
    } catch (e) {
        return { status: e.response ? e.response.status : 500, data: e.response ? e.response.data : null };
    }
}

async function runTests() {
    function log(msg) { fs.appendFileSync('test_output.txt', msg + '\n'); console.log(msg); }
    log('--- STARTING E2E BACKEND TESTS (AXIOS) ---');

    log('\n--- 1. Register/Login as Patient ---');
    const ptEmail = `pt_${Date.now()}@test.com`;
    let res = await req('POST', '/auth/register', { name: "Test Pt", phone: ptEmail, password: "password123", role: "MOTHER" });
    log(`Reg Pt: ${res.status} ${JSON.stringify(res.data)}`);
    res = await req('POST', '/auth/login', { phone: ptEmail, password: "password123", role: "MOTHER" });
    patientToken = res.data?.token;
    log(`Login Pt: ${res.status} ${!!patientToken}`);

    log('\n--- 2. Create Profile ---');
    res = await req('POST', '/patients', { name: "Test Pt", age: 25, trimester: "second", phone: ptEmail }, patientToken);
    patientProfId = res.data?.patient?._id;
    log(`Create Prof: ${res.status} ${res.data?.success}`);

    log('\n--- 3. Upload PDF ---');
    res = await req('POST', '/patients/me/documents', { documentType: 'PREVIOUS_MEDICAL_REPORT', file: pdfPath }, patientToken, true);
    docId1 = res.data?.document?._id;
    log(`Upload PDF: ${res.status} ${res.data?.success}`);

    log('\n--- 4. List Docs ---');
    res = await req('GET', '/patients/me/documents', null, patientToken);
    log(`Docs List: ${res.status} ${res.data?.documents?.length > 0}`);

    log('\n--- 5. Upload Invalid File ---');
    res = await req('POST', '/patients/me/documents', { documentType: 'LAB_REPORT', file: txtPath }, patientToken, true);
    log(`Upload Txt (400): ${res.status} ${res.data?.error}`);

    log('\n--- 6. Upload Large File ---');
    res = await req('POST', '/patients/me/documents', { documentType: 'LAB_REPORT', file: largePath }, patientToken, true);
    log(`Upload Lrg (400/500): ${res.status} ${res.data?.error}`);

    log('\n--- 7. Register/Login Worker ---');
    const wrkEmail = `wrk_${Date.now()}@test.com`;
    res = await req('POST', '/auth/register', { name: "Test Wrk", phone: wrkEmail, password: "password123", role: "HEALTH_WORKER" });
    log(`Reg Wrk: ${res.status} ${JSON.stringify(res.data)}`);
    res = await req('POST', '/auth/login', { phone: wrkEmail, password: "password123", role: "HEALTH_WORKER" });
    workerToken = res.data?.token;
    log(`Login Wrk: ${res.status} ${!!workerToken}`);

    log('\n--- 8. Unauthorized Doc Access (blocked) ---');
    res = await req('GET', `/documents/${docId1}/download`, null, workerToken);
    log(`Block 403: ${res.status}`);

    log('\n--- 9. Delete Doc ---');
    res = await req('DELETE', `/patients/me/documents/${docId1}`, null, patientToken);
    log(`Del Doc: ${res.status} ${res.data?.success}`);

    // Clean up
    fs.unlinkSync(pdfPath);
    fs.unlinkSync(imgPath);
    fs.unlinkSync(txtPath);
    fs.unlinkSync(largePath);
    log('--- DONE ---');
}
runTests();
