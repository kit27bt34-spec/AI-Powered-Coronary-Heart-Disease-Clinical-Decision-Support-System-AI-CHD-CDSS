import os
import sys
import glob
import time
import json
import yaml
import logging
import hashlib
import platform
import subprocess
import joblib
import optuna
import shap
import mlflow
import numpy as np

import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import confusion_matrix, roc_curve, precision_recall_curve, auc, log_loss

# Add project root to sys.path to ensure proper backend/module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from training.feature_engineering import AgeGroupTransformer, ClinicalRiskAggregator
from training.split import split_dataset
from training.preprocess import PreprocessingPipeline
from training.feature_selection import remove_low_variance, remove_collinear_features
from models.logistic_regression import LogisticRegressionModel
from models.random_forest import RandomForestModel
from models.xgboost_model import XGBoostModel
from models.lightgbm_model import LightGBMModel
from models.catboost_model import CatBoostModel
from models.neural_network import NeuralNetworkModel
from evaluation.calibration import ProbabilityCalibrator, calculate_ece
from evaluation.metrics import calculate_all_metrics, calculate_dca_net_benefit, calculate_dca_treat_all_net_benefit
from evaluation.fairness import evaluate_subgroup_metrics
from evaluation.explainability import ClinicalSHAPExplainer
from mlops.mlflow_manager import MLflowManager
from mlops.model_registry import ClinicalModelRegistry

# Setup logging
os.makedirs("training/logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("training/logs/training_execution.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ModelTrainingPipeline")

# Disable optuna logs output to stdout, keep error only
optuna.logging.set_verbosity(optuna.logging.WARNING)

# Helper function to generate file checksum
def calculate_sha256(filepath: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

# Pure-python custom SMOTE for oversampling minority classes
def run_custom_smote(X: pd.DataFrame, y: pd.Series, k_neighbors: int = 5, random_state: int = 42) -> tuple:
    """
    Synthetically samples minority class rows to balance training dataset labels.
    """
    np.random.seed(random_state)
    class_counts = y.value_counts()
    majority_class = class_counts.idxmax()
    minority_class = class_counts.idxmin()
    
    X_majority = X[y == majority_class]
    X_minority = X[y == minority_class]
    
    n_majority = len(X_majority)
    n_minority = len(X_minority)
    
    if n_minority <= 1 or n_majority <= n_minority:
        return X.copy(), y.copy()
        
    n_synthetic = n_majority - n_minority
    k = min(k_neighbors, n_minority - 1)
    if k < 1:
        return X.copy(), y.copy()
        
    nn = NearestNeighbors(n_neighbors=k + 1)
    nn.fit(X_minority)
    neighbors = nn.kneighbors(X_minority, return_distance=False)[:, 1:]
    
    synthetic_samples = []
    for _ in range(n_synthetic):
        idx = np.random.randint(0, n_minority)
        sample = X_minority.iloc[idx].values
        
        neighbor_idx = np.random.choice(neighbors[idx])
        neighbor = X_minority.iloc[neighbor_idx].values
        
        diff = neighbor - sample
        gap = np.random.rand()
        synthetic_val = sample + gap * diff
        synthetic_samples.append(synthetic_val)
        
    df_synthetic = pd.DataFrame(synthetic_samples, columns=X.columns)
    y_synthetic = pd.Series([minority_class] * n_synthetic)
    
    X_resampled = pd.concat([X, df_synthetic], ignore_index=True)
    y_resampled = pd.concat([y, y_synthetic], ignore_index=True)
    
    logger.info(f"Custom SMOTE completed. Balanced training set from {len(X)} to {len(X_resampled)} rows.")
    return X_resampled, y_resampled

class TrainingPipeline:
    def __init__(self, config_path: str = "configs/app_config.yaml", ml_config_path: str = "configs/ml_config.yaml"):
        self.config_path = config_path
        self.ml_config_path = ml_config_path
        self.app_config = self._load_yaml(config_path)
        self.ml_config = self._load_yaml(ml_config_path)
        
    def _load_yaml(self, path: str) -> dict:
        with open(path, "r") as f:
            return yaml.safe_load(f)

    def generate_data_readiness_report(self, df: pd.DataFrame, dataset_path: str) -> dict:
        """
        Validates clinical dataset integrity before model training.
        """
        logger.info("Executing Data Readiness Validation...")
        report = {}
        
        # 1. Dataset metadata checks
        report["dataset_path"] = dataset_path
        report["dataset_checksum"] = calculate_sha256(dataset_path)
        
        # Look for lineage checksum match
        lineage_path = os.path.join(self.app_config["etl"]["output_dir"], "lineage_metadata.json")
        report["lineage_checksum_match"] = False
        if os.path.exists(lineage_path):
            try:
                with open(lineage_path, "r") as f:
                    lin_meta = json.load(f)
                    for run in lin_meta.get("runs", []):
                        for out in run.get("outputs", []):
                            if out.get("file_name") == "parquet" and out.get("sha256_checksum") == report["dataset_checksum"]:
                                report["lineage_checksum_match"] = True
                                report["dataset_version"] = run.get("dataset_version")
                                break
            except Exception as e:
                logger.warning(f"Error checking lineage checksum: {e}")
                
        if "dataset_version" not in report:
            report["dataset_version"] = "unknown_version"
            
        # 2. Rows, Admissions, Patients counts
        report["row_count"] = len(df)
        report["unique_patients"] = df["subject_id"].nunique() if "subject_id" in df.columns else len(df)
        report["unique_admissions"] = df["hadm_id"].nunique() if "hadm_id" in df.columns else len(df)
        
        # Check duplicate admissions
        duplicate_admissions = df["hadm_id"].duplicated().sum() if "hadm_id" in df.columns else 0
        report["duplicate_admissions"] = int(duplicate_admissions)
        
        # 3. Class distributions
        chd_positive = int(df["target"].sum())
        chd_negative = len(df) - chd_positive
        report["chd_positive_cases"] = chd_positive
        report["chd_negative_cases"] = chd_negative
        report["class_ratio_positive"] = float(chd_positive / len(df))
        
        # 4. Null value thresholds check
        null_counts = df.isnull().sum().to_dict()
        report["missing_values"] = null_counts
        
        # Strict checks on demographics (age/gender) and target
        demo_nulls = null_counts.get("age", 0) + null_counts.get("gender", 0) + null_counts.get("target", 0)
        report["demo_or_target_nulls_present"] = demo_nulls > 0
        
        # 5. Distributions and outliers checks (age, BP, BMI, glucose, HR)
        outliers = {}
        limits = self.app_config["validation"]
        
        for feature in ["age", "bmi", "systolic_bp", "diastolic_bp", "glucose", "heart_rate"]:
            if feature in df.columns:
                feat_min = limits[feature]["min"]
                feat_max = limits[feature]["max"]
                # Count non-null rows falling outside limits
                outlier_cnt = df[df[feature].notnull() & ((df[feature] < feat_min) | (df[feature] > feat_max))].shape[0]
                outliers[feature] = outlier_cnt
                
        report["outlier_counts"] = outliers
        report["outliers_present"] = sum(outliers.values()) > 0
        
        # Determine success status
        # Validation FAILS if there are duplicate admissions, or if nulls exist in demographics/target
        validation_failed = (duplicate_admissions > 0) or (demo_nulls > 0)
        report["validation_passed"] = not validation_failed
        
        # Write report to markdown artifact file
        os.makedirs("artifacts", exist_ok=True)
        report_path = "artifacts/data_readiness_report.md"
        with open(report_path, "w") as f:
            f.write("# Clinical Data Readiness & Integrity Report\n\n")
            f.write(f"- **Generated At**: {datetime.utcnow().isoformat()}Z\n")
            f.write(f"- **Dataset Version**: {report['dataset_version']}\n")
            f.write(f"- **Parquet File Checksum**: `{report['dataset_checksum']}`\n")
            f.write(f"- **Lineage Verified**: {report['lineage_checksum_match']}\n\n")
            f.write("## Dataset Characteristics\n")
            f.write(f"- **Total Rows (Admissions)**: {report['row_count']}\n")
            f.write(f"- **Unique Patients**: {report['unique_patients']}\n")
            f.write(f"- **Unique Admissions**: {report['unique_admissions']}\n")
            f.write(f"- **Duplicate Admissions**: {report['duplicate_admissions']} (MUST be 0)\n")
            f.write(f"- **CHD Positive Target Cases**: {report['chd_positive_cases']}\n")
            f.write(f"- **CHD Negative Target Cases**: {report['chd_negative_cases']}\n")
            f.write(f"- **Class Prevalence**: {report['class_ratio_positive']*100:.2f}% Positive\n\n")
            f.write("## Quality Checks\n")
            f.write(f"- **Demographics / Target Nulls Present**: {report['demo_or_target_nulls_present']}\n")
            f.write(f"- **Outliers Present**: {report['outliers_present']}\n")
            f.write(f"- **Validation Status**: {'PASSED' if report['validation_passed'] else 'FAILED - STOPPING PIPELINE'}\n\n")
            f.write("### Missing Values Per Column:\n")
            for col, cnt in null_counts.items():
                if cnt > 0:
                    f.write(f"- `{col}`: {cnt} nulls ({cnt/len(df)*100:.1f}%)\n")
            f.write("\n### Outlier Summary:\n")
            for feat, cnt in outliers.items():
                f.write(f"- `{feat}`: {cnt} records out of range limits [{limits[feat]['min']}, {limits[feat]['max']}]\n")
                
        logger.info(f"Data Readiness report generated successfully: {report_path}")
        return report

    def run_optuna_hpo(self, model_name: str, X_train: pd.DataFrame, y_train: pd.Series, X_val: pd.DataFrame, y_val: pd.Series, n_trials: int = 15) -> dict:
        """
        Runs hyperparameter search using Optuna to maximize Validation ROC-AUC.
        """
        logger.info(f"Launching Optuna HPO search study for {model_name}...")
        
        # Parallel trials and seed configuration
        random_seed = self.ml_config["meta"]["random_seed"]
        
        def objective(trial):
            if model_name == "LogisticRegression":
                c_val = trial.suggest_float("C", 0.001, 100.0, log=True)
                penalty = trial.suggest_categorical("penalty", ["l1", "l2"])
                solver = "liblinear" if penalty == "l1" else "lbfgs"
                model_obj = LogisticRegressionModel(C=c_val, penalty=penalty, solver=solver, random_state=random_seed, max_iter=1000)
                
            elif model_name == "RandomForest":
                n_est = trial.suggest_int("n_estimators", 10, 300)
                max_d = trial.suggest_int("max_depth", 2, 15)
                min_split = trial.suggest_int("min_samples_split", 2, 10)
                class_w = trial.suggest_categorical("class_weight", ["balanced", None])
                model_obj = RandomForestModel(n_estimators=n_est, max_depth=max_d, min_samples_split=min_split, class_weight=class_w, random_state=random_seed)
                
            elif model_name == "XGBoost":
                n_est = trial.suggest_int("n_estimators", 50, 300)
                max_d = trial.suggest_int("max_depth", 2, 10)
                lr = trial.suggest_float("learning_rate", 0.005, 0.2, log=True)
                sub = trial.suggest_float("subsample", 0.5, 1.0)
                model_obj = XGBoostModel(n_estimators=n_est, max_depth=max_d, learning_rate=lr, subsample=sub, random_state=random_seed, eval_metric="logloss")
                
            elif model_name == "LightGBM":
                n_est = trial.suggest_int("n_estimators", 50, 300)
                max_d = trial.suggest_int("max_depth", 2, 10)
                lr = trial.suggest_float("learning_rate", 0.005, 0.2, log=True)
                num_l = trial.suggest_int("num_leaves", 8, 128)
                model_obj = LightGBMModel(n_estimators=n_est, max_depth=max_d, learning_rate=lr, num_leaves=num_l, random_state=random_seed, verbose=-1)
                
            elif model_name == "CatBoost":
                iterations = trial.suggest_int("iterations", 50, 300)
                depth = trial.suggest_int("depth", 2, 10)
                lr = trial.suggest_float("learning_rate", 0.005, 0.2, log=True)
                model_obj = CatBoostModel(iterations=iterations, depth=depth, learning_rate=lr, random_seed=random_seed, verbose=0)
                
            elif model_name == "NeuralNetwork":
                alpha = trial.suggest_float("alpha", 1e-5, 1e-1, log=True)
                lr_init = trial.suggest_float("learning_rate_init", 1e-4, 1e-2, log=True)
                hidden = trial.suggest_categorical("hidden_layers", ["32", "64_32", "128_64_32"])
                sizes = (32,)
                if hidden == "64_32":
                    sizes = (64, 32)
                elif hidden == "128_64_32":
                    sizes = (128, 64, 32)
                model_obj = NeuralNetworkModel(alpha=alpha, learning_rate_init=lr_init, hidden_layer_sizes=sizes, max_iter=500, random_state=random_seed)
                
            else:
                raise ValueError(f"Unknown model name: {model_name}")
                
            model_obj.train(X_train, y_train)
            probs = model_obj.predict_proba(X_val)
            
            # Metric to maximize
            from sklearn.metrics import roc_auc_score
            return float(roc_auc_score(y_val, probs))
            
        study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=random_seed))
        
        # Run HPO search trials
        # Demo dataset HPO is scaled down for speed (min trials=5 if demo dataset)
        study.optimize(objective, n_trials=n_trials, n_jobs=1)
        logger.info(f"Study completed for {model_name}. Best trial score (ROC-AUC): {study.best_value:.4f}")
        
        # Save study object
        os.makedirs("models", exist_ok=True)
        joblib.dump(study, f"models/optuna_study_{model_name}.joblib")
        return study.best_params

    def run_calibration_search(self, model, X_val: pd.DataFrame, y_val: pd.Series) -> tuple:
        """
        Fits and compares Platt scaling vs Isotonic regression, returning the best-calibrated calibrator.
        """
        raw_probs = model.predict_proba(X_val)
        y_val_arr = np.array(y_val)
        
        # Evaluate uncalibrated Brier score
        from sklearn.metrics import brier_score_loss
        brier_uncal = brier_score_loss(y_val_arr, raw_probs)
        
        # Fit Platt Scaling Calibrator
        calib_platt = ProbabilityCalibrator(method="platt")
        calib_platt.fit(raw_probs, y_val_arr)
        probs_platt = calib_platt.calibrate(raw_probs)
        brier_platt = brier_score_loss(y_val_arr, probs_platt)
        
        # Fit Isotonic Regression Calibrator
        calib_isotonic = ProbabilityCalibrator(method="isotonic")
        calib_isotonic.fit(raw_probs, y_val_arr)
        probs_isotonic = calib_isotonic.calibrate(raw_probs)
        brier_isotonic = brier_score_loss(y_val_arr, probs_isotonic)
        
        # Select best calibration method
        scores = {
            "uncalibrated": brier_uncal,
            "platt": brier_platt,
            "isotonic": brier_isotonic
        }
        best_method = min(scores, key=scores.get)
        logger.info(f"Calibration compare Brier scores: {scores}. Selected method: {best_method}")
        
        if best_method == "platt":
            return calib_platt, "platt", scores
        elif best_method == "isotonic":
            return calib_isotonic, "isotonic", scores
        else:
            # Fallback identity calibrator
            class IdentityCalibrator:
                def __init__(self):
                    self.method = "identity"
                def calibrate(self, probs):
                    return probs
            return IdentityCalibrator(), "uncalibrated", scores

    def execute_pipeline(self):
        os.environ["MLFLOW_TRACKING_URI"] = "sqlite:///mlflow.db"
        logger.info("Executing Phase 2.2 Model Training Pipeline...")

        
        # 1. Dataset location and metadata checks
        output_dir = self.app_config["etl"]["output_dir"]
        master_csv = "data/raw/master_cardiac_dataset.csv"
        if os.path.exists(master_csv):
            dataset_path = master_csv
            df = pd.read_csv(dataset_path)
            logger.info(f"Loaded master combined cardiac dataset ({len(df)} rows) from {master_csv}")
        else:
            files = glob.glob(os.path.join(output_dir, "processed_*_v1.parquet"))
            if not files:
                files = glob.glob(os.path.join(output_dir, "processed_*_v1.csv"))
            if not files:
                raise FileNotFoundError(f"No processed clinical datasets found in {output_dir}")
                
            dataset_path = max(files, key=os.path.getmtime)
            df = pd.read_parquet(dataset_path) if dataset_path.endswith(".parquet") else pd.read_csv(dataset_path)
        
        # Check if production-scale dataset or demo dataset
        is_production_dataset = len(df) > 5000
        if not is_production_dataset:
            logger.warning("=" * 80)
            logger.warning("DEMO DATASET DETECTED (MIMIC-IV Demo). PIPELINE RUNNING IN SMOKE-TEST MODE.")
            logger.warning("The resulting models and statistics are NOT production-ready.")
            logger.warning("Final training must be performed on the full MIMIC-IV Clinical Database.")
            logger.warning("=" * 80)
            
        # 2. Run Data Readiness check
        report = self.generate_data_readiness_report(df, dataset_path)
        if not report["validation_passed"]:
            logger.error("Data Readiness check failed. STOPPING MODEL TRAINING.")
            raise RuntimeError("Pipeline stopped due to database data integrity failure.")
            
        # 3. Patient-level splitting (zero subject leakage)
        logger.info("Splitting dataset...")
        train_df, val_df, test_df = split_dataset(
            df,
            train_ratio=self.ml_config["splitting"]["train_ratio"],
            val_ratio=self.ml_config["splitting"]["validation_ratio"],
            test_ratio=self.ml_config["splitting"]["test_ratio"],
            random_seed=self.ml_config["meta"]["random_seed"]
        )
        
        X_train, y_train = train_df.drop(columns=["target"]), train_df["target"]
        X_val, y_val = val_df.drop(columns=["target"]), val_df["target"]
        X_test, y_test = test_df.drop(columns=["target"]), test_df["target"]
        
        # Check split leakage before training
        train_patients = set(X_train["subject_id"].unique())
        val_patients = set(X_val["subject_id"].unique())
        test_patients = set(X_test["subject_id"].unique())
        assert train_patients.isdisjoint(val_patients), "Patient overlap (leakage) detected between Train and Val sets!"
        assert train_patients.isdisjoint(test_patients), "Patient overlap (leakage) detected between Train and Test sets!"
        assert val_patients.isdisjoint(test_patients), "Patient overlap (leakage) detected between Val and Test sets!"
        
        # 4. Fit Preprocessing Pipeline
        passthrough_cols = [
            "hypertension", "diabetes", "previous_cardiac", "smoking",
            "statin_history", "beta_blocker_history", "ace_arb_history", "aspirin_history",
            "bmi_missing", "bp_missing", "glucose_missing", "chol_missing", "hr_missing"
        ]
        passthrough_cols = [c for c in passthrough_cols if c in X_train.columns]
        
        numerical_cols = [
            "age", "bmi", "systolic_bp", "diastolic_bp", "glucose", "heart_rate",
            "cholesterol", "admission_frequency", "medication_count", "comorbidity_burden"
        ]
        
        # Run age and risk aggregation engineering transformers
        age_trans = AgeGroupTransformer()
        risk_agg = ClinicalRiskAggregator()
        
        X_train = age_trans.transform(X_train)
        X_train = risk_agg.transform(X_train)
        
        X_val = age_trans.transform(X_val)
        X_val = risk_agg.transform(X_val)
        
        X_test = age_trans.transform(X_test)
        X_test = risk_agg.transform(X_test)
        
        numerical_cols = [c for c in numerical_cols if c in X_train.columns]
        categorical_cols = ["gender", "age_group"]
        categorical_cols = [c for c in categorical_cols if c in X_train.columns]
        
        preprocess_pipeline = PreprocessingPipeline(self.ml_config_path)
        preprocess_pipeline.build_pipeline(numerical_cols, categorical_cols, passthrough_cols)
        
        X_train_prep = preprocess_pipeline.fit_transform(X_train)
        X_val_prep = preprocess_pipeline.transform(X_val)
        X_test_prep = preprocess_pipeline.transform(X_test)
        
        # Apply Feature Selection filters
        variance_thresh = self.ml_config["feature_selection"]["variance_threshold"]
        correlation_thresh = self.ml_config["feature_selection"]["correlation_threshold"]
        
        X_train_selected = remove_low_variance(X_train_prep, threshold=variance_thresh)
        X_train_selected = remove_collinear_features(X_train_selected, threshold=correlation_thresh)
        
        selected_features = list(X_train_selected.columns)
        logger.info(f"Selected {len(selected_features)} features: {selected_features}")
        
        X_val_selected = X_val_prep[selected_features]
        X_test_selected = X_test_prep[selected_features]
        
        # 5. Handle Class Imbalance
        # Check minority prevalence
        prev = y_train.value_counts(normalize=True).min()
        logger.info(f"Minority class prevalence in train split: {prev*100:.2f}%")
        
        # Default training features
        X_train_final, y_train_final = X_train_selected.copy(), y_train.copy()
        
        # If prevalence < 40%, flag as imbalanced
        use_smote = False
        use_class_weight = False
        if prev < 0.40:
            # We configure SMOTE as the primary oversampler for this run
            use_smote = True
            logger.info("Class imbalance detected. Enabling SMOTE oversampling on training split.")
            X_train_final, y_train_final = run_custom_smote(X_train_selected, y_train, random_state=self.ml_config["meta"]["random_seed"])
        
        # 6. Train & Optimize Models
        # Models configuration and search loops
        models_tuning = {
            "LogisticRegression": LogisticRegressionModel,
            "RandomForest": RandomForestModel,
            "XGBoost": XGBoostModel,
            "LightGBM": LightGBMModel,
            "CatBoost": CatBoostModel,
            "NeuralNetwork": NeuralNetworkModel
        }
        
        tuned_models = {}
        calibrators = {}
        calibration_methods = {}
        val_calibrated_probs = {}
        test_calibrated_probs = {}
        
        # Limit trials on demo dataset smoke test for execution speed
        trials_count = 5 if not is_production_dataset else 20
        
        for name, model_class in models_tuning.items():
            best_params = self.run_optuna_hpo(
                name, X_train_final, y_train_final, X_val_selected, y_val, n_trials=trials_count
            )
            logger.info(f"Fitting optimized {name} with parameters: {best_params}")
            
            # Map hidden layer parameter if neural net
            if name == "NeuralNetwork" and "hidden_layers" in best_params:
                hidden = best_params.pop("hidden_layers")
                best_params["hidden_layer_sizes"] = (128, 64, 32) if hidden == "128_64_32" else ((64, 32) if hidden == "64_32" else (32,))
                
            # Map solver for LogisticRegression to avoid l1/lbfgs conflict
            if name == "LogisticRegression":
                if best_params.get("penalty") == "l1":
                    best_params["solver"] = "liblinear"
                else:
                    best_params["solver"] = "lbfgs"
                
            model_instance = model_class(random_state=self.ml_config["meta"]["random_seed"], **best_params)

            model_instance.train(X_train_final, y_train_final)
            
            # Fit probability calibrator on validation set
            best_calibrator, method, calib_scores = self.run_calibration_search(model_instance, X_val_selected, y_val)
            calibrators[name] = best_calibrator
            calibration_methods[name] = method
            
            val_probs_raw = model_instance.predict_proba(X_val_selected)
            val_calibrated_probs[name] = best_calibrator.calibrate(val_probs_raw)
            
            test_probs_raw = model_instance.predict_proba(X_test_selected)
            test_calibrated_probs[name] = best_calibrator.calibrate(test_probs_raw)
            
            tuned_models[name] = model_instance
            
        # 7. Model Evaluation & DCA calculations
        logger.info("Evaluating tuned calibrated models on Test split...")
        all_metrics_report = {}
        dca_report = {}
        
        for name, model in tuned_models.items():
            probs = test_calibrated_probs[name]
            preds = (probs >= 0.5).astype(int)
            metrics = calculate_all_metrics(y_test.values, preds, probs)
            
            # Log expected calibration error (ECE)
            metrics["ece"] = calculate_ece(y_test.values, probs)
            metrics["calibration_method"] = calibration_methods[name]
            
            # Decision Curve Analysis (clinical net benefits) at standard thresholds: 10% and 20% risk
            nb_10 = calculate_dca_net_benefit(y_test.values, probs, threshold=0.10)
            nb_20 = calculate_dca_net_benefit(y_test.values, probs, threshold=0.20)
            metrics["net_benefit_10pct"] = nb_10
            metrics["net_benefit_20pct"] = nb_20
            
            all_metrics_report[name] = metrics
            
        # Compute default baseline net benefits
        dca_treat_all_10 = calculate_dca_treat_all_net_benefit(y_test.values, threshold=0.10)
        dca_treat_all_20 = calculate_dca_treat_all_net_benefit(y_test.values, threshold=0.20)
        
        # Write comparison table CSV
        os.makedirs("models", exist_ok=True)
        comparison_df = pd.DataFrame(all_metrics_report).T
        comparison_path = "models/comparison_table.csv"
        comparison_df.to_csv(comparison_path)
        logger.info(f"Saved model comparison table: {comparison_path}")
        
        # 8. Fairness subgroups Auditing
        logger.info("Auditing models for fairness across sensitive subgroups...")
        fairness_reports = {}
        fairness_failed_models = []
        
        # Configurable fairness parity thresholds (disparity bounds)
        fairness_threshold = 0.20
        
        for name, model in tuned_models.items():
            test_df_copy = test_df.copy()
            if "age_group" not in test_df_copy.columns:
                test_df_copy = age_trans.transform(test_df_copy)
            gender_fairness = evaluate_subgroup_metrics(test_df_copy, y_test.values, (test_calibrated_probs[name] >= 0.5).astype(int), test_calibrated_probs[name], "gender")

            age_fairness = evaluate_subgroup_metrics(test_df_copy, y_test.values, (test_calibrated_probs[name] >= 0.5).astype(int), test_calibrated_probs[name], "age_group")
            
            # Check for disparities exceeding thresholds
            failed = False
            for disp_name, disp_metrics in gender_fairness.get("disparities", {}).items():
                for key, val in disp_metrics.items():
                    if abs(val) > fairness_threshold:
                        failed = True
                        logger.warning(f"Fairness alert for {name}: Gender disparity '{key}' = {val:.4f} exceeds threshold +/-{fairness_threshold}!")
            
            for disp_name, disp_metrics in age_fairness.get("disparities", {}).items():
                for key, val in disp_metrics.items():
                    if abs(val) > fairness_threshold:
                        failed = True
                        logger.warning(f"Fairness alert for {name}: Age Group disparity '{key}' = {val:.4f} exceeds threshold +/-{fairness_threshold}!")
                        
            fairness_reports[name] = {
                "gender": gender_fairness,
                "age_group": age_fairness,
                "passed_fairness": not failed
            }
            if failed:
                fairness_failed_models.append(name)
                
        # 9. Model Ranking and Selection
        logger.info("Ranking models on multi-dimensional clinical and operational trade-offs...")
        ranking_records = []
        
        # Estimated latencies (average ms per prediction)
        latencies = {}
        for name, model in tuned_models.items():
            t0 = time.perf_counter()
            # Predict 50 times to get stable latency estimate
            for _ in range(50):
                _ = model.predict_proba(X_test_selected)
            latencies[name] = ((time.perf_counter() - t0) * 1000.0) / (50 * len(X_test_selected))
            
        for name, metrics in all_metrics_report.items():
            # Weighted utility ranking index
            # Index = 0.4*AUC - 0.2*Brier - 0.2*ECE - 0.1*Latency_ms - 0.1*Fairness_failed
            auc_val = metrics["roc_auc"]
            brier = metrics["brier_score"]
            ece = metrics["ece"]
            latency = latencies[name]
            fair_fail = 1.0 if name in fairness_failed_models else 0.0
            
            utility_score = (4.0 * auc_val) - (2.0 * brier) - (2.0 * ece) - (0.1 * min(latency, 10.0)) - (0.5 * fair_fail)
            
            ranking_records.append({
                "Model": name,
                "ROC-AUC": auc_val,
                "Brier-Score": brier,
                "ECE": ece,
                "Latency-MS": latency,
                "Passed-Fairness": "YES" if name not in fairness_failed_models else "NO",
                "Utility-Score": utility_score
            })
            
        ranking_df = pd.DataFrame(ranking_records).sort_values("Utility-Score", ascending=False)
        ranking_path = "models/model_ranking.csv"
        ranking_df.to_csv(ranking_path, index=False)
        logger.info(f"\nModel Rankings:\n{ranking_df.to_string(index=False)}")
        
        # Best model is the top ranked model
        best_model_name = ranking_df.iloc[0]["Model"]
        best_model = tuned_models[best_model_name]
        best_calibrator = calibrators[best_model_name]
        logger.info(f"🏆 Best selected production model: {best_model_name}")
        
        # 10. Generate SHAP Explainability plots for the best model
        logger.info(f"Generating SHAP plots for best model: {best_model_name}...")
        model_type = "tree"
        if best_model_name == "LogisticRegression":
            model_type = "linear"
        elif best_model_name == "NeuralNetwork":
            model_type = "kernel"
            
        shap_explainer = ClinicalSHAPExplainer(best_model.model, model_type=model_type)
        # Background data for Kernel / Linear SHAP
        shap_explainer.fit_explainer(X_train_selected)
        shap_values = shap_explainer.calculate_shap_values(X_test_selected)
        
        os.makedirs("artifacts/shap", exist_ok=True)
        summary_plot_path = "artifacts/shap/summary_beeswarm.png"
        shap_explainer.save_summary_plot(shap_values, X_test_selected, summary_plot_path)
        
        # Bar plot
        plt.figure(figsize=(10, 6))
        shap.plots.bar(shap_values, show=False)
        plt.tight_layout()
        bar_plot_path = "artifacts/shap/global_bar_importance.png"
        plt.savefig(bar_plot_path, dpi=150)
        plt.close()
        
        # Local waterfall plots (first 3 patients)
        waterfall_paths = []
        for idx in range(min(3, len(X_test_selected))):
            wf_path = f"artifacts/shap/waterfall_patient_{idx}.png"
            shap_explainer.save_local_waterfall_plot(shap_values, idx, wf_path)
            waterfall_paths.append(wf_path)
            
        # Dependence Plot for Age
        plt.figure(figsize=(10, 6))
        # shap.dependence_plot expects class 1 probabilities index 1 if 3D
        plot_values = shap_values
        if len(shap_values.shape) == 3 and shap_values.shape[2] == 2:
            plot_values = shap_values[:, :, 1]
            
        shap.dependence_plot("age", plot_values.values, X_test_selected, show=False)
        plt.tight_layout()
        dep_plot_path = "artifacts/shap/dependence_age.png"
        plt.savefig(dep_plot_path, dpi=150)
        plt.close()
        
        # Local Force Plot
        force_data = shap_explainer.generate_local_force_plot_data(shap_values, 0)
        force_json_path = "artifacts/shap/local_force_patient_0.json"
        with open(force_json_path, "w") as f:
            json.dump(force_data, f, indent=4)
            
        # 11. Log Best Model to MLflow Registry
        ml_manager = MLflowManager(self.ml_config_path)
        config = ml_manager.config
        
        experiment_name = config["mlflow"].get("experiment_name", "CHD_Predictive_CDSS")
        mlflow.set_experiment(experiment_name)
        
        # Log system parameter details
        git_hash = ml_manager.get_git_revision_hash()
        docker_ver = ml_manager.get_docker_version()
        python_ver = platform.python_version()
        
        best_metrics = all_metrics_report[best_model_name]
        
        # Log custom MLflow run
        with mlflow.start_run(run_name=f"Production_{best_model_name}") as run:
            run_id = run.info.run_id
            
            # Log params
            params = best_model.model.get_params() if hasattr(best_model.model, "get_params") else {}
            serializable_params = {k: str(v) for k, v in params.items() if isinstance(v, (int, float, str, bool, list, dict, type(None)))}
            mlflow.log_params(serializable_params)
            
            mlflow.log_param("git_commit_hash", git_hash)
            mlflow.log_param("docker_version", docker_ver)
            mlflow.log_param("python_version", python_ver)
            mlflow.log_param("random_seed", config["meta"]["random_seed"])
            mlflow.log_param("dataset_version", report["dataset_version"])
            mlflow.log_param("calibration_method", calibration_methods[best_model_name])
            mlflow.log_param("imbalance_handled", "SMOTE" if use_smote else "None")
            
            # Log metrics
            for k, v in best_metrics.items():
                if isinstance(v, (int, float)):
                    mlflow.log_metric(f"test_{k}", v)
                    
            # Log plots as artifacts
            mlflow.log_artifact(summary_plot_path, "plots/shap")
            mlflow.log_artifact(bar_plot_path, "plots/shap")
            mlflow.log_artifact(dep_plot_path, "plots/shap")
            mlflow.log_artifact(force_json_path, "plots/shap")
            for wp in waterfall_paths:
                mlflow.log_artifact(wp, "plots/shap")
                
            # Log comparison and ranking files
            mlflow.log_artifact(comparison_path, "metrics")
            mlflow.log_artifact(ranking_path, "metrics")
            
            # Save and log best model itself
            model_flavor_log = mlflow.sklearn
            if best_model_name == "XGBoost":
                model_flavor_log = mlflow.xgboost
            elif best_model_name == "LightGBM":
                model_flavor_log = mlflow.lightgbm
            elif best_model_name == "CatBoost":
                model_flavor_log = mlflow.catboost
                
            model_flavor_log.log_model(best_model.model, "model")
            logger.info(f"Logged best model {best_model_name} to MLflow run {run_id}")
            
        # Register best model in clinical model registry
        registry = ClinicalModelRegistry(self.ml_config_path)
        version = registry.register_model_version(run_id, model_path="model")
        
        # Transition stage to Staging (canonical MLflow stage)
        registry.transition_stage(version, "Staging")
        logger.info(f"Registered model version {version} and transitioned to Staging stage.")

        
        # 12. Save output files locally under models/
        os.makedirs("models", exist_ok=True)
        joblib.dump(best_model, "models/best_model.joblib")
        joblib.dump(preprocess_pipeline, "models/preprocess_pipeline.joblib")
        joblib.dump(best_calibrator, "models/calibrator.joblib")
        
        # Save metadata JSON
        metadata = {
            "model_name": best_model_name,
            "version": str(version),
            "mlflow_run_id": run_id,
            "dataset_version": report["dataset_version"],
            "dataset_checksum": report["dataset_checksum"],
            "training_date": datetime.utcnow().date().isoformat(),
            "calibration_method": calibration_methods[best_model_name],
            "brier_scores_calibration": calib_scores,
            "fairness_status": "Passed" if best_model_name not in fairness_failed_models else "Failed Thresholds",
            "is_smoke_test_only": not is_production_dataset
        }
        
        with open("models/model_metadata.json", "w") as f:
            json.dump(metadata, f, indent=4)
            
        # Save feature schema JSON
        feature_schema = {
            "numerical_features": numerical_cols,
            "categorical_features": categorical_cols,
            "passthrough_features": passthrough_cols,
            "selected_features": selected_features
        }
        with open("models/feature_schema.json", "w") as f:
            json.dump(feature_schema, f, indent=4)
            
        # 13. Generate Model Card MD
        card_path = "artifacts/model_card.md"
        with open(card_path, "w") as f:
            f.write("# Clinical Model Card - Coronary Heart Disease CDSS\n\n")
            f.write(f"- **Model Name**: {best_model_name}\n")
            f.write(f"- **Model Registry Version**: Version {version}\n")
            f.write(f"- **Algorithm Type**: {type(best_model.model).__name__}\n")
            f.write(f"- **Training Date**: {metadata['training_date']}\n")
            f.write(f"- **Approval Status**: Under Clinical Validation Review\n\n")
            f.write("## Intended Use\n")
            f.write("This model is designed to assist clinicians in estimating 10-year risk of Coronary Heart Disease (CHD) for patients admitted to critical care units, leveraging demographic, comorbidity, and vital lab telemetry. It is intended for decision support only and does not replace medical diagnostics.\n\n")
            f.write("## Dataset Details\n")
            f.write(f"- **Source**: MIMIC-IV Clinical Database\n")
            f.write(f"- **Dataset Version**: {report['dataset_version']}\n")
            f.write(f"- **Checksum**: `{report['dataset_checksum']}`\n")
            f.write(f"- **Is Smoke Test Model**: {metadata['is_smoke_test_only']} (Trained on Demo Dataset)\n\n")
            f.write("## Performance Metrics (Test Split)\n")
            f.write(f"- **ROC-AUC**: {best_metrics['roc_auc']:.4f}\n")
            f.write(f"- **PR-AUC**: {best_metrics['pr_auc']:.4f}\n")
            f.write(f"- **Log Loss**: {best_metrics['log_loss']:.4f}\n")
            f.write(f"- **Brier Score**: {best_metrics['brier_score']:.4f}\n")
            f.write(f"- **Expected Calibration Error (ECE)**: {best_metrics['ece']:.4f}\n")
            f.write(f"- **Sensitivity (Recall)**: {best_metrics['recall']:.4f}\n")
            f.write(f"- **Specificity**: {best_metrics['specificity']:.4f}\n")
            f.write(f"- **Balanced Accuracy**: {best_metrics['balanced_accuracy']:.4f}\n")
            f.write(f"- **Net Benefit @ 10% threshold**: {best_metrics['net_benefit_10pct']:.4f} (Treat All: {dca_treat_all_10:.4f})\n")
            f.write(f"- **Net Benefit @ 20% threshold**: {best_metrics['net_benefit_20pct']:.4f} (Treat All: {dca_treat_all_20:.4f})\n\n")
            f.write("## Calibration and Fairness\n")
            f.write(f"- **Calibration Method**: {calibration_methods[best_model_name].capitalize()}\n")
            f.write(f"- **Fairness Review**: Passed target bounds: {metadata['fairness_status'] == 'Passed'}\n\n")
            f.write("## Limitations & Known Risks\n")
            f.write("> [!WARNING]\n")
            f.write("> **Non-Production Warning**: This model version was trained on a small, non-representative demo dataset (MIMIC-IV Demo). It must not be deployed to patient care workflows. Re-train the model pipeline on the full clinical database or staging dataset to obtain a clinically verified production model.\n")
            
        logger.info(f"Model card written to: {card_path}")
        logger.info("Phase 2.2 Model Training Pipeline completed successfully.")
        
if __name__ == "__main__":
    pipeline = TrainingPipeline()
    pipeline.execute_pipeline()
