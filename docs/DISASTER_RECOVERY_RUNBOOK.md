# Disaster Recovery & Business Continuity Runbook (AI-CHD-CDSS)

## 1. Executive Summary & Recovery Objectives
- **Recovery Time Objective (RTO)**: **< 15 Minutes**
- **Recovery Point Objective (RPO)**: **< 1 Minute**
- **Primary Database Engine**: PostgreSQL 16 Managed Service
- **Secondary Failover**: Multi-Region Read Replica & Snapshot Storage

---

## 2. Disaster Recovery Failover Procedures

### Step 1: Detect Primary Database Outage
- Kubernetes readiness probe `/health/ready` returns HTTP 503 Service Unavailable.
- Prometheus triggers alert `PostgreSQLInstanceDown`.

### Step 2: Initiate Point-In-Time-Recovery (PITR)
1. Run automated restore script:
   ```bash
   python scripts/disaster_recovery.py
   ```
2. Verify SHA-256 checksum match output:
   `[INFO] Backup integrity verification: PASSED (Checksum matched).`

### Step 3: Redirect Traffic via Kubernetes Ingress / API Gateway
1. Update DNS / Ingress endpoint to failover database host address:
   ```bash
   kubectl apply -f deploy/k8s/deployment.yaml
   ```
2. Validate system liveness:
   ```bash
   curl -f http://localhost:8000/health/ready
   ```
