import pandas as pd
from sklearn.model_selection import train_test_split
import logging

logger = logging.getLogger("DataSplitting")

def split_dataset(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_seed: int = 42,
    patient_id_col: str = "subject_id",
    target_col: str = "target"
) -> tuple:
    """
    Splits the dataset into train, validation, and test datasets based on patient IDs.
    Guarantees that no patient is present in more than one split (zero patient leakage).
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    
    df_clean = df.copy()
    if patient_id_col not in df_clean.columns:
        df_clean[patient_id_col] = df_clean.index

    # 1. Extract unique patient IDs and their aggregate target status (stratification key)
    patient_targets = df_clean.groupby(patient_id_col)[target_col].max().reset_index()
    
    # Calculate ratios relative to remaining data
    val_test_sum = val_ratio + test_ratio
    test_relative_ratio = test_ratio / val_test_sum
    
    # 2. Split patients into Train vs Temp (Val + Test)
    use_stratify = True
    class_counts = patient_targets[target_col].value_counts()
    if len(class_counts) < 2 or class_counts.min() < 2:
        use_stratify = False
        logger.warning("Class counts are too small for stratified splitting. Bypassing stratification.")
        
    if use_stratify:
        train_pts, temp_pts = train_test_split(
            patient_targets,
            test_size=val_test_sum,
            random_state=random_seed,
            stratify=patient_targets[target_col]
        )
    else:
        train_pts, temp_pts = train_test_split(
            patient_targets,
            test_size=val_test_sum,
            random_state=random_seed
        )
    
    # 3. Split Temp into Val vs Test
    temp_class_counts = temp_pts[target_col].value_counts()
    use_temp_stratify = use_stratify and len(temp_class_counts) >= 2 and temp_class_counts.min() >= 2
    
    if use_temp_stratify:
        val_pts, test_pts = train_test_split(
            temp_pts,
            test_size=test_relative_ratio,
            random_state=random_seed,
            stratify=temp_pts[target_col]
        )
    else:
        val_pts, test_pts = train_test_split(
            temp_pts,
            test_size=test_relative_ratio,
            random_state=random_seed
        )
    
    train_ids = train_pts[patient_id_col].values
    val_ids = val_pts[patient_id_col].values
    test_ids = test_pts[patient_id_col].values
    
    # 4. Map back to full admissions dataset
    train_df = df_clean[df_clean[patient_id_col].isin(train_ids)].copy()
    val_df = df_clean[df_clean[patient_id_col].isin(val_ids)].copy()
    test_df = df_clean[df_clean[patient_id_col].isin(test_ids)].copy()
    
    logger.info(f"Split completed. Train: {len(train_df)} rows, Val: {len(val_df)} rows, Test: {len(test_df)} rows.")
    
    # Verification check: assert zero overlap
    train_subjects = set(train_df[patient_id_col].unique())
    val_subjects = set(val_df[patient_id_col].unique())
    test_subjects = set(test_df[patient_id_col].unique())
    
    assert train_subjects.isdisjoint(val_subjects), "Patient leakage detected between Train and Val"
    assert train_subjects.isdisjoint(test_subjects), "Patient leakage detected between Train and Test"
    assert val_subjects.isdisjoint(test_subjects), "Patient leakage detected between Val and Test"
    
    return train_df, val_df, test_df
