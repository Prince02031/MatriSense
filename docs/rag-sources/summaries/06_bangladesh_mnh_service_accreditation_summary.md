# Bangladesh MNH Service Accreditation / Clinical Protocol Resources  
**Source:** *Operational Manual for Maternal and Newborn Health Service Accreditation Program* and related DGHS/Hospital Services checklists  
**Primary use in MatriSense:** Bangladesh health-system alignment, facility readiness, quality-of-care framing, health-worker dashboard design, referral/follow-up workflow.  
**Download / reference:**  
- Operational manual PDF: https://hospitaldghs.gov.bd/wp-content/uploads/2023/05/MNH-Service-Accreditation-Manual_Clean_Cor-14-4-23.pdf  
- Antenatal Care checklist: https://hospitaldghs.gov.bd/wp-content/uploads/2024/05/Checklist-02-Antenatal-Care.pdf  
- Facility readiness checklist: https://hospitaldghs.gov.bd/wp-content/uploads/2024/05/Checklist-04-Facility-Readiness.pdf  
- Tools/checklists page: https://hospitaldghs.gov.bd/tools/  

---

## 1. What this source is about

This source is a Bangladesh health-system and service-quality resource. It is useful for showing that MatriSense is not only a symptom app, but can support:

```text
structured case documentation
health-worker review
referral notes
facility readiness thinking
follow-up accountability
quality-of-care improvement
```

The operational manual also references maternal and newborn health service standards and includes danger-sign related content. It should be treated as an important local institutional reference.

---

## 2. Best use in MatriSense

Use this source mainly for:

```text
health-worker dashboard requirements
referral workflow
case documentation fields
follow-up status
facility/service-quality alignment
Bangladesh-specific institutional credibility
```

Use WHO/CDC/PCPNC as the primary source for initial MVP danger-sign rules unless you have manually reviewed the exact danger-sign annex in the accreditation manual.

---

## 3. Health-worker dashboard implications

MatriSense should show health workers:

```text
patient profile
pregnancy stage
symptom input
AI-extracted symptoms
confirmed symptoms
follow-up answers
rule-engine risk level
matched rules
reasons
evidence tags
RAG cards used
patient guidance shown
referral/follow-up note
case status
```

This aligns with service-quality thinking because the case is traceable and can be reviewed.

---

## 4. Referral note structure

Recommended `ReferralNote` model:

```json
{
  "sessionId": "string",
  "patientId": "string",
  "riskLevel": "LOW | MEDIUM | HIGH",
  "workerId": "string",
  "workerAssessment": "string",
  "actionTaken": "REFERRED | CALLED | FOLLOW_UP_SCHEDULED | ADVISED_CLINIC | CLOSED",
  "facilityName": "string",
  "followUpDate": "date",
  "notes": "string",
  "createdAt": "date"
}
```

---

## 5. High-risk operational implication

For a HIGH-risk case, MatriSense should not stop at showing a result to the mother. It should also:

```text
create or update a triage session
mark the case as HIGH priority
place the case at the top of the worker dashboard
show urgent action label
allow referral note creation
show source/matched-rule panel
preserve an audit log
```

Example status flow:

```text
NEW_HIGH_RISK
→ WORKER_REVIEWED
→ CONTACT_ATTEMPTED
→ REFERRED_TO_FACILITY
→ FOLLOW_UP_SCHEDULED
→ CLOSED
```

---

## 6. RAG knowledge-card use

This source can support cards such as:

```text
BD_MNH_REFERRAL_WORKFLOW
BD_MNH_HEALTH_WORKER_CASE_REVIEW
BD_MNH_FACILITY_READINESS
BD_MNH_ANC_CHECKLIST_LOCAL_QUALITY
```

These cards should be mostly health-worker-facing, not mother-facing.

Example card:

```json
{
  "id": "bd_mnh_high_risk_worker_review",
  "sourceName": "Bangladesh MNH Service Accreditation Manual",
  "sourceType": "health_system_quality",
  "guidanceType": "HEALTH_WORKER_REVIEW",
  "riskLevelAllowed": ["HIGH", "MEDIUM"],
  "stepsBn": [
    "রোগীর লক্ষণ, গর্ভকালীন তথ্য এবং ফলো-আপ উত্তর পর্যালোচনা করুন।",
    "প্রয়োজন হলে দ্রুত রেফারেল বা স্বাস্থ্যকেন্দ্রের সঙ্গে যোগাযোগের ব্যবস্থা করুন।",
    "কেস নোটে নেওয়া পদক্ষেপ লিখে রাখুন।"
  ],
  "doNotSay": [
    "patient diagnosis",
    "medicine dosage",
    "ignore referral"
  ],
  "evidenceTag": "BD_MNH_WORKER_REVIEW"
}
```

---

## 7. Safety and governance implications

This source supports the idea that MatriSense should have:

```text
audit trail
controlled access
health-worker review
referral documentation
case status tracking
quality indicators
```

These are very useful for judging because they show real-world health-system thinking.

---

## 8. Rule-engine implications

Potential rules from the manual should be created only after manually extracting exact danger signs from the document.

Safe immediate use:

```text
Use as dashboard/referral/process reference.
Use as local evidence for quality-of-care.
Do not use for detailed clinical treatment logic.
```

---

## 9. Important limitation

The source may contain clinical and facility-standard details meant for trained health systems. MatriSense MVP should not turn those into patient-facing treatment instructions. Use it mostly for health-worker workflow, referral notes, and operational design.
