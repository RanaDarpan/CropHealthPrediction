"""
train.py — XGBoost training pipeline for crop health prediction.
Uses Sentinel-2 band data + soil data from Google Earth Engine exports.
Target: NDVI (proxy for vegetation health).
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor
from joblib import dump

from preprocessing import (
    load_and_merge_data, extract_features, get_feature_columns, MODEL_DIR
)

# ---------- Configuration ----------
BANDS_CSV = os.path.join(os.path.dirname(__file__), '4Farms_AllBands_AllIndices_2018_2024.csv')
SOIL_CSV = os.path.join(os.path.dirname(__file__), '4Farms_SoilData.csv')
TARGET = 'NDVI'
TEST_SIZE = 0.2
RANDOM_STATE = 42


def train():
    print('=' * 60)
    print('  AgriSense ML — XGBoost Crop Health Model Training')
    print('=' * 60)

    # 1. Load & merge data
    print('\n[1/6] Loading data...')
    df = load_and_merge_data(BANDS_CSV, SOIL_CSV)
    print(f'  Rows: {len(df)}, Columns: {len(df.columns)}')
    print(f'  Farms: {df["farm_id"].unique().tolist()}')
    print(f'  Date range: {df["date"].min()} → {df["date"].max()}')
    
    # 2. Feature engineering
    print('\n[2/6] Extracting features...')
    df_features = extract_features(df)
    
    feature_cols = get_feature_columns(df_features, target=TARGET)
    X = df_features[feature_cols]
    y = df_features[TARGET]
    
    print(f'  Features: {len(feature_cols)}')
    print(f'  Target ({TARGET}) stats: mean={y.mean():.4f}, std={y.std():.4f}, min={y.min():.4f}, max={y.max():.4f}')

    # 3. Train/test split (stratified by farm via approximate binning)
    print('\n[3/6] Splitting data...')
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    print(f'  Train: {len(X_train)} samples, Test: {len(X_test)} samples')

    # 4. Scale features
    print('\n[4/6] Scaling features...')
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 5. Train XGBoost
    print('\n[5/6] Training XGBoost...')
    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbosity=0
    )
    model.fit(
        X_train_scaled, y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=False
    )

    # 6. Evaluate
    print('\n[6/6] Evaluating model...')
    y_pred_train = model.predict(X_train_scaled)
    y_pred_test = model.predict(X_test_scaled)

    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    test_mae = mean_absolute_error(y_test, y_pred_test)

    # Cross-validation
    cv_scores = cross_val_score(model, scaler.transform(X), y, cv=5, scoring='r2')

    print(f'\n  {"Metric":<25} {"Value":>10}')
    print(f'  {"-" * 36}')
    print(f'  {"Train R²":<25} {train_r2:>10.4f}')
    print(f'  {"Test R²":<25} {test_r2:>10.4f}')
    print(f'  {"Test RMSE":<25} {test_rmse:>10.4f}')
    print(f'  {"Test MAE":<25} {test_mae:>10.4f}')
    print(f'  {"CV R² (5-fold mean)":<25} {cv_scores.mean():>10.4f}')
    print(f'  {"CV R² (std)":<25} {cv_scores.std():>10.4f}')

    # Feature importance (top 15)
    importances = pd.Series(model.feature_importances_, index=feature_cols)
    importances = importances.sort_values(ascending=False)
    print(f'\n  Top 10 Features:')
    for feat, imp in importances.head(10).items():
        print(f'    {feat:<25} {imp:.4f}')

    # Save model artifacts
    print('\n  Saving model artifacts...')
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    dump(model, MODEL_DIR / 'xgboost_model.joblib')
    dump(scaler, MODEL_DIR / 'scaler.joblib')
    dump(feature_cols, MODEL_DIR / 'feature_columns.joblib')

    # Save metadata
    metadata = {
        'target': TARGET,
        'n_features': len(feature_cols),
        'feature_columns': feature_cols,
        'n_train_samples': len(X_train),
        'n_test_samples': len(X_test),
        'metrics': {
            'train_r2': round(train_r2, 4),
            'test_r2': round(test_r2, 4),
            'test_rmse': round(test_rmse, 4),
            'test_mae': round(test_mae, 4),
            'cv_r2_mean': round(cv_scores.mean(), 4),
            'cv_r2_std': round(cv_scores.std(), 4)
        },
        'top_features': {feat: round(float(imp), 4) for feat, imp in importances.head(15).items()},
        'xgboost_params': model.get_params()
    }
    # Convert numpy types to Python types for JSON serialization
    def convert_numpy(obj):
        if isinstance(obj, (np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj

    metadata_clean = json.loads(json.dumps(metadata, default=convert_numpy))
    with open(MODEL_DIR / 'metadata.json', 'w') as f:
        json.dump(metadata_clean, f, indent=2)

    print(f'\n  ✅ Model saved to {MODEL_DIR}/')
    print(f'  ✅ Test R² = {test_r2:.4f} | RMSE = {test_rmse:.4f}')
    print('=' * 60)

    return model, scaler, metadata


if __name__ == '__main__':
    train()
