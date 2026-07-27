# Clinical AI Validation & Governance Report (AI-CHD-CDSS)

## 1. Clinical Model Specifications
- **Selected Architecture**: CatBoost Classifier with Isotonic Probability Calibration (Version 9)
- **Validation Dataset Volume**: 4,683 Combined Patient Admissions (*Framingham Study + UCI Heart Cohorts*)
- **Target Variable**: 10-Year Risk of Coronary Heart Disease (CHD) / Myocardial Infarction

---

## 2. Quantitative Performance & Calibration Metrics
- **Area Under ROC Curve (ROC-AUC)**: **81.35%** ($0.8135$)
- **Holdout Test Accuracy**: **74.26%**
- **Specificity (True Negative Rate)**: **81.84%**
- **Precision**: **76.67%**
- **Expected Calibration Error (ECE)**: **0.0146** *(Near Zero Drift)*

---

## 3. Explainability & Clinical Decision Support Cards
- **Global Feature Drivers (SHAP Beeswarm Summary)**:
  1. Age & Age-Systolic BP Interaction Term
  2. Systolic & Diastolic Blood Pressure
  3. Total Serum Cholesterol & Glucose-BMI Ratio
  4. Comorbidity Burden Index & Active Smoking History
- **Human-in-the-Loop Safeguards**: AI predictions provide risk scores alongside SHAP waterfall plots for clinician verification prior to therapeutic decisions.
