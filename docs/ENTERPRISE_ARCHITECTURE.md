# AI-CHD-CDSS Enterprise Architecture & Operations Guide

## 1. System Architecture
The AI-Powered Clinical Decision Support System for Coronary Heart Disease (AI-CHD-CDSS) uses a cloud-native, microservices-oriented architecture:

- **Frontend Tier**: Next.js 16 App Router + React 19 + TailwindCSS + Lucide Icons.
- **Backend Tier**: FastAPI REST API framework running on Python 3.13 with Uvicorn worker process management.
- **Database Tier**: Managed PostgreSQL database instance enforcing foreign key constraints, index optimization, and JSON metrics storage.
- **Queue & Async Processing**: Celery worker framework powered by Redis memory broker for heavy asynchronous PDF generation and telemetry exports.
- **Machine Learning Engine**: CatBoost Classifier with Isotonic probability calibration, MLflow artifact tracking, and SHAP tree explainer integration.

---

## 2. DevSecOps & Security Policy
- **Authentication**: Short-lived JSON Web Tokens (JWT) signed via HS256 with HTTPOnly cookie rotation.
- **Password Security**: BCrypt password hashing with salt generation and password policy enforcement.
- **Fail-Fast Environment Security**: Automatic application termination on startup if `DATABASE_URL`, `JWT_SECRET_KEY`, or `SECRET_KEY` environment variables are missing or insecure.
- **Security Headers**: Enforces HTTP Strict Transport Security (`Strict-Transport-Security`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and Content Security Policy (`Content-Security-Policy`).

---

## 3. MLOps & Model Monitoring Workflow
1. **Data Ingestion**: Multi-cohort dataset ingestion (Framingham, UCI Heart, Cardio Train datasets).
2. **Feature Engineering**: Clinical biomarkers (Pulse Pressure, MAP, Glucose-BMI ratio, Comorbidity Index).
3. **Hyperparameter Search**: Automated Optuna study across 6 algorithm architectures (CatBoost, LightGBM, XGBoost, Neural Network, Random Forest, Logistic Regression).
4. **Validation & Automated Rejection**: Candidate models failing validation thresholds or performing below active staging baselines are automatically rejected.
5. **Drift Monitoring**: Continuous Kolmogorov-Smirnov feature drift and Population Stability Index (PSI) tracking.

---

## 4. Disaster Recovery & Backup Strategy
- **Automated Database Backups**: Nightly `pg_dump` backups executed via Cron to encrypted S3-compatible cloud storage.
- **Point-In-Time-Recovery (PITR)**: Write-Ahead Logging (WAL) archiving configured for sub-minute recovery points.
- **RTO & RPO Objectives**:
  - Recovery Time Objective (RTO): < 15 minutes.
  - Recovery Point Objective (RPO): < 1 minute.
