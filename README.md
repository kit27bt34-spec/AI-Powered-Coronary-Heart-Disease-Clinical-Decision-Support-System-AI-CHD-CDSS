# 🫀 AI-Powered Coronary Heart Disease Clinical Decision Support System (AI-CHD-CDSS)

[![Live Demo](https://img.shields.io/badge/Live_Demo-chd--frontend.onrender.com-4F46E5.svg?style=for-the-badge&logo=render)](https://chd-frontend.onrender.com)
[![API Docs](https://img.shields.io/badge/API_Docs-FastAPI_Swagger-009688.svg?style=for-the-badge&logo=fastapi)](https://chd-backend-pqwe.onrender.com/docs)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat&logo=python)](https://www.python.org/)
[![CatBoost](https://img.shields.io/badge/CatBoost-Ensemble-FF6F00.svg?style=flat)](https://catboost.ai/)
[![SHAP](https://img.shields.io/badge/SHAP-Explainable_AI-10B981.svg?style=flat)](https://shap.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**AI-CHD-CDSS** is a full-stack, enterprise-grade **Clinical Decision Support System (CDSS)** designed for cardiologists, clinical ward physicians, intensive care units, and hospital executive leadership. The platform integrates **Gradient Boosted Machine Learning (CatBoost & XGBoost)** and **Explainable AI (SHAP)** with a PostgreSQL clinical database to calculate calibrated 10-year **Coronary Heart Disease (CHD)** risk probabilities from patient vitals, laboratory biomarkers, and comorbidity risk factors.

Designed to enhance physician workflows, AI-CHD-CDSS acts as an intelligent clinical co-pilot—converting complex patient telemetry into clear risk stratifications, evidence-based ACC/AHA recommendations, exportable hospital PDF charts, and enterprise-wide clinical intelligence dashboards.

> [!IMPORTANT]
> **Clinical Governance & Disclaimer**: AI-CHD-CDSS is designed strictly as a Clinical Decision Support System to assist healthcare professionals. It operates as an evidence-based clinical co-pilot and does not replace direct clinical evaluation, diagnostic judgment, or primary attending physician care.

---

## 🌟 Key Portals & Platform Capability

### 🩺 1. Doctor Portal & Clinical Decision Co-Pilot
- **Real-Time Patient Risk Assessment**: Computes model-driven 10-year CHD risk probabilities without hardcoded fallback metrics.
- **Explainable AI (SHAP) Attribution**: Generates itemized visual feature attributions for every prediction, separating **Risk-Increasing Drivers ($\mathbf{\Delta}$)** from **Protective Baseline Factors ($\mathbf{\nabla}$)**.
- **Strict Clinical Validation Rules**: Enforces physiological boundaries so that healthy parameters (e.g., Blood Pressure $<120/80\text{ mmHg}$, Fasting Glucose $<100\text{ mg/dL}$, Age $<60$) are **never** labeled as risk vectors.
- **Evidence-Based ACC/AHA Care Plans**: Dynamically synthesizes guideline recommendations for statin intensity, antihypertensive titration, lifestyle modification, and cardiology referral.
- **ICU Patient Record Integration**: One-click lookup and risk scoring from hospital admission records and MIMIC-IV datasets.
- **Hospital PDF Report Engine**: Generates dense, multi-section clinical PDF charts with custom patient headers, risk meters, SHAP breakdown tables, and clinician sign-off signatures.

### 🛡️ 2. Super Admin Portal & Clinical Intelligence Center
- **Executive Clinical Intelligence Center (`/admin/clinical-analytics`)**: Data-driven population health telemetry displaying real-time risk stratification distributions, disease burden analysis, department performance matrices, and model accuracy validations.
- **Hospital Network Management (`/admin/hospitals`)**: Multi-hospital workspace provisioning, department allocation, facility bed monitoring (Total, ICU, CCU), and emergency hotline governance.
- **Department Management (`/admin/departments`)**: Ward configuration, head clinician assignments, and active clinical department performance tracking.
- **Doctor & User Governance (`/admin/doctors`, `/admin/users`)**: Multi-role account provisioning (`doctor`, `super_admin`, `auditor`, `researcher`), status toggle, credentials reset, and active directory management.
- **Patient Registry & EHR Management (`/admin/patients`)**: Global patient directory synced in real time across Doctor and Super Admin portals.
- **Security & Audit Governance (`/admin/security`)**: Real-time password strength scoring, multi-factor authentication (MFA) enforcement, and immutable audit logs of administrative actions.

---

## 🔄 System Architecture & Data Flow

```
                                  +---------------------------------------+
                                  |         NGINX / Render Proxy          |
                                  |           (Port 80 / 443)             |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
         +---------------v---------------+                         +---------------v---------------+
         |     Next.js 16 Web Portal     |                         |        FastAPI Backend        |
         |     (App Router, React 19)    |                         |      (Python 3.12, Uvicorn)   |
         +-------------------------------+                         +---------------+---------------+
                                                                                   |
                                                     +-----------------------------+-----------------------------+
                                                     |                             |                             |
                                      +--------------v--------------+ +------------v------------+ +--------------v--------------+
                                      |     PostgreSQL Database     | |   MLflow & SHAP Engine  | |      Audit & PDF Engine     |
                                      |   (Users, Patients, Vitals) | | (CatBoost, Calibration) | |    (jsPDF, Event Bus Logs)  |
                                      +-----------------------------+ +-------------------------+ +-----------------------------+
```

---

## ⚙️ Machine Learning & Explainable AI (XAI) Pipeline

```
Raw Clinical Telemetry ──► Feature Engineering ──► Model Ensemble ──► Probability Calibration ──► SHAP Attributions ──► Guidelines Engine
```

### 1. Model Ensemble Architecture
- **Classifier**: CatBoost Classifier & XGBoost Ensemble
- **Validation ROC-AUC**: `0.763`
- **Cross-Validation ROC-AUC**: `0.758`
- **Inference Latency**: `< 20 ms`
- **Probability Calibration**: **Platt Scaling** and **Isotonic Regression** layers to ensure un-biased probability distributions.

### 2. Feature Schema & Engineering

| Feature Name | Type | Unit / Range | Clinical Description |
| :--- | :--- | :--- | :--- |
| `age` | Integer | $18 - 100\text{ yrs}$ | Patient biological age |
| `gender` | Binary | `0=Female, 1=Male` | Biological sex |
| `bmi` | Float | $12.0 - 60.0\text{ kg/m}^2$ | Body Mass Index |
| `systolic_bp` | Float | $70 - 240\text{ mmHg}$ | Systolic Blood Pressure |
| `diastolic_bp` | Float | $40 - 140\text{ mmHg}$ | Diastolic Blood Pressure |
| `glucose` | Float | $50 - 500\text{ mg/dL}$ | Fasting blood glucose level |
| `cholesterol` | Float | $80 - 600\text{ mg/dL}$ | Total serum cholesterol |
| `heart_rate` | Float | $30 - 220\text{ bpm}$ | Resting heart rate |
| `hypertension` | Binary | `0=No, 1=Yes` | History of Essential Hypertension |
| `diabetes` | Binary | `0=No, 1=Yes` | History of Diabetes Mellitus |
| `smoking` | Binary | `0=No, 1=Yes` | Tobacco smoking history |
| `previous_cardiac`| Binary | `0=No, 1=Yes` | History of MI, Angina, or CABG |
| `statin_history` | Binary | `0=No, 1=Yes` | Active statin therapy |

---

## 📊 Risk Stratification Categories

| Risk Level | Probability Range | Clinical Care Action Target |
| :--- | :--- | :--- |
| 🟢 **Very Low Risk** | $0.0\% - 4.9\%$ | Routine lifestyle maintenance & annual cardiovascular screening |
| 🟢 **Low Risk** | $5.0\% - 9.9\%$ | Primary prevention counseling & lipid monitoring |
| 🟡 **Moderate Risk** | $10.0\% - 19.9\%$ | Moderate-intensity intervention; blood pressure & lipid targets |
| 🟠 **High Risk** | $20.0\% - 39.9\%$ | Intensive statin/antihypertensive pharmacotherapy; specialist referral |
| 🔴 **Very High Risk**| $\ge 40.0\%$ | Urgent Cardiology evaluation, advanced imaging & CCU admission triage |

---

## 💻 Technology Stack

| Architecture Layer | Component Technologies |
| :--- | :--- |
| **Frontend UI** | Next.js 16 (App Router), React 19, TypeScript 5.0, Tailwind CSS, Glassmorphic UI Design System, Lucide Icons |
| **Backend API** | Python 3.12, FastAPI, Uvicorn, Pydantic v2, Asyncio |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0, Alembic Database Migrations |
| **Machine Learning & XAI** | CatBoost, XGBoost, Scikit-Learn, SHAP, Optuna, Pandera |
| **PDF Generation** | jsPDF, jsPDF-AutoTable |
| **DevOps & Cloud** | Docker, NGINX, GitHub Actions CI/CD, Render (`render.yaml`) |

---

## 📁 Repository Directory Structure

```
AI-CHD-CDSS/
├── .github/workflows/ci_cd.yml       # Automated GitHub Actions CI/CD pipeline
├── backend/
│   ├── database/                     # SQLAlchemy models & connection management
│   ├── migrations/                   # Alembic schema migration files
│   ├── scripts/seed_db.py            # Database initialization script
│   ├── services/                     # Business logic services (ClinicalIntelligence, Hospital, PatientAnalytics)
│   ├── tests/                        # Pytest suite (Endpoints, Auth, Inference)
│   ├── admin.py                      # Super Admin Portal API endpoints
│   ├── auth.py                       # JWT Authentication endpoints
│   ├── main.py                       # FastAPI application entry point
│   ├── predictions.py                # ML Model inference & SHAP engine
│   ├── security.py                   # Bcrypt password hashing & JWT security
│   └── requirements.txt              # Backend Python dependencies
├── frontend/
│   ├── src/app/                      # Next.js App Router pages (/, /admin/*, /doctor/*)
│   ├── src/components/               # Glassmorphism UI components (GlassCard, GlassButton)
│   ├── src/lib/pdfGenerator.ts       # Hospital PDF Chart Generator
│   └── package.json                  # Frontend dependencies
├── docker-compose.yml                # Docker container orchestration
├── render.yaml                       # Render cloud deployment blueprint
└── README.md                         # Project documentation
```

---

## 🌐 Key REST API Endpoints

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticates user credentials & returns JWT token | Public |
| `POST` | `/api/v1/predict/direct` | Runs ML prediction & SHAP explanation for patient vitals | Doctor, Admin |
| `GET` | `/api/v1/patients/` | Fetches patient registry from PostgreSQL | Doctor, Admin |
| `POST` | `/api/v1/patients/` | Registers a new patient in PostgreSQL | Doctor, Admin |
| `GET` | `/api/v1/admin/clinical-intelligence` | Returns data-driven clinical metrics, trends, and KPIs | Super Admin |
| `GET` | `/api/v1/admin/hospitals` | Lists all hospital facilities and bed allocations | Super Admin |
| `PUT` | `/api/v1/admin/hospitals/{id}` | Updates hospital configuration & bed details | Super Admin |
| `GET` | `/api/v1/admin/users` | Lists system user accounts with filters | Super Admin |
| `POST` | `/api/v1/admin/users` | Provisions new doctor or admin accounts | Super Admin |

---

## 🚀 Quickstart & Local Installation Guide

### Prerequisites
- **Python**: `3.12+`
- **Node.js**: `20.x+`
- **PostgreSQL**: `16.x`

---

### Step 1: Clone Repository
```bash
git clone https://github.com/tulasiram04/AI-CHD-CDSS.git
cd AI-CHD-CDSS
```

---

### Step 2: Configure & Start Backend
```bash
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations & seed system structure
alembic -c backend/alembic.ini upgrade head
python backend/scripts/seed_db.py

# Launch FastAPI application
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: `http://localhost:8000/docs`

---

### Step 3: Configure & Start Frontend
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
Web Application will be available at: `http://localhost:3000`

---

### Step 4: Docker Deployment (Optional)
```bash
docker compose up --build -d
```

---

## 🧪 Testing & Code Quality Verification

```bash
# Run backend pytest suite
python -m pytest backend/tests/

# Verify TypeScript compilation
cd frontend
npx tsc --noEmit
```

---

## ☁️ Production Deployment

The project includes a pre-configured `render.yaml` blueprint for automatic cloud deployment on Render:
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Blueprint Deployment**.
3. Render automatically provisions:
   - **FastAPI Backend Web Service**: `chd-backend`
   - **Next.js Frontend Web Service**: `chd-frontend`

---

## 📄 License & Legal Notice

### License
This project is open-source under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Clinical Disclaimer
> **NOTICE**: AI-CHD-CDSS is built solely as a decision support co-pilot for medical professionals. Final clinical assessments and diagnostic treatments remain under the direct authority of the attending clinician.
