import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

class AgeGroupTransformer(BaseEstimator, TransformerMixin):
    """
    Groups age into clinically meaningful categories.
    Categorical categories:
      - 0: <45 (Low default age risk)
      - 1: 45-65 (Moderate age risk)
      - 2: >65 (High age risk)
    """
    def __init__(self, age_column: str = "age"):
        self.age_column = age_column

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X_out = X.copy()
        if self.age_column in X_out.columns:
            X_out["age_group"] = pd.cut(
                X_out[self.age_column],
                bins=[0, 45, 65, 120],
                labels=[0, 1, 2],
                include_lowest=True
            ).astype(int)
        return X_out

class ClinicalRiskAggregator(BaseEstimator, TransformerMixin):
    """
    Creates enhanced clinical risk features from lab indicators, vitals, and comorbidities.
    """
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X_out = X.copy()

        # 1. Pulse Pressure & Mean Arterial Pressure
        if "systolic_bp" in X_out.columns and "diastolic_bp" in X_out.columns:
            sys_bp = X_out["systolic_bp"].fillna(120.0)
            dia_bp = X_out["diastolic_bp"].fillna(80.0)
            X_out["pulse_pressure"] = sys_bp - dia_bp
            X_out["mean_arterial_pressure"] = dia_bp + (X_out["pulse_pressure"] / 3.0)

        # 2. Glucose-to-BMI Ratio & Cardiac Index
        if "glucose" in X_out.columns and "bmi" in X_out.columns:
            gluc = X_out["glucose"].fillna(95.0)
            bmi = X_out["bmi"].fillna(25.0)
            X_out["glucose_bmi_ratio"] = gluc / (bmi.replace(0, np.nan).fillna(25.0))

        # 3. Age-Systolic BP Interaction Term
        if "age" in X_out.columns and "systolic_bp" in X_out.columns:
            age = X_out["age"].fillna(55.0)
            sys_bp = X_out["systolic_bp"].fillna(120.0)
            X_out["age_sysbp_product"] = (age * sys_bp) / 100.0

        # 4. Weighted Comorbidity Risk Load Index
        comorbidities = ["hypertension", "diabetes", "smoking", "previous_cardiac"]
        existing_comorb = [c for c in comorbidities if c in X_out.columns]
        
        if existing_comorb:
            cardiac = X_out["previous_cardiac"].fillna(0) if "previous_cardiac" in X_out.columns else 0
            diabetes = X_out["diabetes"].fillna(0) if "diabetes" in X_out.columns else 0
            htn = X_out["hypertension"].fillna(0) if "hypertension" in X_out.columns else 0
            smk = X_out["smoking"].fillna(0) if "smoking" in X_out.columns else 0

            X_out["comorbidity_burden"] = (1.2 * cardiac) + (1.0 * diabetes) + (0.8 * htn) + (0.8 * smk)
            
        return X_out
