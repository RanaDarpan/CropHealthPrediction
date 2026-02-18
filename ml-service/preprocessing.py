"""
preprocessing.py — Shared feature engineering pipeline for training and inference.
Ensures consistency between model training and real-time predictions.
"""

import numpy as np
import pandas as pd
from joblib import load, dump
from pathlib import Path
import os

# ---------- Constants ----------
BAND_COLUMNS = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']
INDEX_COLUMNS = ['NDVI', 'EVI', 'NDWI', 'SAVI']
SOIL_SURFACE_COLS = [
    'clay_0-5cm_mean', 'nitrogen_0-5cm_mean', 'phh2o_0-5cm_mean',
    'sand_0-5cm_mean', 'soc_0-5cm_mean'
]
SOIL_RENAME = {
    'clay_0-5cm_mean': 'clay',
    'nitrogen_0-5cm_mean': 'nitrogen',
    'phh2o_0-5cm_mean': 'ph',
    'sand_0-5cm_mean': 'sand',
    'soc_0-5cm_mean': 'soc'
}

MODEL_DIR = Path(__file__).parent / 'model'


def load_and_merge_data(bands_csv: str, soil_csv: str) -> pd.DataFrame:
    """Load both CSVs, merge on farm_id, aggregate duplicate tiles."""
    df_bands = pd.read_csv(bands_csv)
    df_soil = pd.read_csv(soil_csv)

    # Drop unnecessary columns
    drop_cols = [c for c in ['system:index', '.geo'] if c in df_bands.columns]
    df_bands.drop(columns=drop_cols, inplace=True)
    drop_cols_soil = [c for c in ['system:index', '.geo'] if c in df_soil.columns]
    df_soil.drop(columns=drop_cols_soil, inplace=True)

    # Parse date
    df_bands['date'] = pd.to_datetime(df_bands['date'])

    # Average duplicate tiles per farm per date (multiple Sentinel-2 tiles can cover same area)
    group_cols = ['farm_id', 'date']
    numeric_cols = [c for c in df_bands.columns if c not in group_cols]
    df_bands = df_bands.groupby(group_cols, as_index=False)[numeric_cols].mean()

    # Select only surface-level soil columns (0-5cm)
    soil_cols_available = [c for c in SOIL_SURFACE_COLS if c in df_soil.columns]
    df_soil_slim = df_soil[['farm_id'] + soil_cols_available].copy()
    df_soil_slim.rename(columns=SOIL_RENAME, inplace=True)

    # Merge
    df = df_bands.merge(df_soil_slim, on='farm_id', how='left')
    return df


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer features from raw band + soil data."""
    df = df.copy()

    # Temporal features
    if 'date' in df.columns:
        df['month'] = df['date'].dt.month
        df['day_of_year'] = df['date'].dt.dayofyear
        # Season: 1=Winter(Dec-Feb), 2=Spring(Mar-May), 3=Summer(Jun-Aug), 4=Autumn(Sep-Nov)
        df['season'] = df['month'].map(lambda m: 1 if m in [12, 1, 2] else (2 if m in [3, 4, 5] else (3 if m in [6, 7, 8] else 4)))

    # Band ratios (key vegetation indicators)
    if 'B8' in df.columns and 'B4' in df.columns:
        df['B8_B4_ratio'] = df['B8'] / df['B4'].replace(0, np.nan)
    if 'B8' in df.columns and 'B3' in df.columns:
        df['B8_B3_ratio'] = df['B8'] / df['B3'].replace(0, np.nan)
    if 'B11' in df.columns and 'B8' in df.columns:
        df['B11_B8_ratio'] = df['B11'] / df['B8'].replace(0, np.nan)
    if 'B5' in df.columns and 'B4' in df.columns:
        df['red_edge_ratio'] = df['B5'] / df['B4'].replace(0, np.nan)

    # Soil-band interaction: nitrogen * NDVI (nutrient availability × greenness)
    if 'nitrogen' in df.columns and 'NDVI' in df.columns:
        df['nitrogen_ndvi'] = df['nitrogen'] * df['NDVI']

    # Drop non-feature columns
    drop = [c for c in ['date', 'farm_id'] if c in df.columns]
    df.drop(columns=drop, inplace=True)

    # Fill NaN / Inf
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.fillna(0, inplace=True)

    return df


def get_feature_columns(df: pd.DataFrame, target: str = 'NDVI') -> list:
    """Get feature column names (everything except target)."""
    return [c for c in df.columns if c != target]


def prepare_prediction_input(band_data: dict, soil_data: dict = None,
                              month: int = None) -> pd.DataFrame:
    """
    Prepare a single prediction sample from raw band + soil values.
    Used by the FastAPI app at inference time.
    
    Args:
        band_data: dict with keys B2, B3, B4, B5, B6, B7, B8, B8A, B11, B12
                   and optionally precomputed EVI, NDWI, SAVI
        soil_data: dict with keys clay, nitrogen, ph, sand, soc (optional)
        month: month (1-12) for temporal features
    """
    row = {}

    # Bands
    for b in BAND_COLUMNS:
        row[b] = band_data.get(b, 0)

    # Compute indices if not provided
    B4 = row.get('B4', 0)
    B8 = row.get('B8', 0)
    B3 = row.get('B3', 0)
    B11 = row.get('B11', 0)

    ndvi = (B8 - B4) / (B8 + B4) if (B8 + B4) != 0 else 0
    row['EVI'] = band_data.get('EVI', 2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * row.get('B2', 0) + 1)) if (B8 + 6 * B4 - 7.5 * row.get('B2', 0) + 1) != 0 else 0)
    row['NDWI'] = band_data.get('NDWI', (B3 - B8) / (B3 + B8) if (B3 + B8) != 0 else 0)
    row['SAVI'] = band_data.get('SAVI', 1.5 * (B8 - B4) / (B8 + B4 + 0.5) if (B8 + B4 + 0.5) != 0 else 0)

    # Soil
    if soil_data:
        for key in ['clay', 'nitrogen', 'ph', 'sand', 'soc']:
            row[key] = soil_data.get(key, 0)
    else:
        for key in ['clay', 'nitrogen', 'ph', 'sand', 'soc']:
            row[key] = 0

    # Temporal
    if month is None:
        from datetime import datetime
        month = datetime.now().month
    row['month'] = month
    row['day_of_year'] = month * 30  # Approximate
    row['season'] = 1 if month in [12, 1, 2] else (2 if month in [3, 4, 5] else (3 if month in [6, 7, 8] else 4))

    # Band ratios
    row['B8_B4_ratio'] = B8 / B4 if B4 != 0 else 0
    row['B8_B3_ratio'] = B8 / B3 if B3 != 0 else 0
    row['B11_B8_ratio'] = B11 / B8 if B8 != 0 else 0
    row['red_edge_ratio'] = row.get('B5', 0) / B4 if B4 != 0 else 0

    # Nitrogen interaction
    row['nitrogen_ndvi'] = row.get('nitrogen', 0) * ndvi

    # Create DataFrame
    df = pd.DataFrame([row])

    # Load saved feature order
    feature_file = MODEL_DIR / 'feature_columns.joblib'
    if feature_file.exists():
        saved_features = load(feature_file)
        # Ensure same columns in same order
        for col in saved_features:
            if col not in df.columns:
                df[col] = 0
        df = df[saved_features]

    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.fillna(0, inplace=True)

    return df


def ndvi_to_health_score(ndvi: float) -> dict:
    """Convert predicted NDVI to a health score and classification."""
    # Clamp to valid range
    ndvi = max(-1.0, min(1.0, ndvi))

    # NDVI to 0-100 health score (agricultural land typically 0.1-0.8)
    if ndvi < 0:
        score = 0
    elif ndvi < 0.1:
        score = int(ndvi * 100)    # 0-10
    elif ndvi < 0.2:
        score = int(10 + (ndvi - 0.1) * 200)  # 10-30
    elif ndvi < 0.4:
        score = int(30 + (ndvi - 0.2) * 150)  # 30-60
    elif ndvi < 0.6:
        score = int(60 + (ndvi - 0.4) * 150)  # 60-90
    else:
        score = int(90 + (ndvi - 0.6) * 25)   # 90-100
    score = min(100, max(0, score))

    # Classification
    if score >= 75:
        classification = 'healthy'
    elif score >= 50:
        classification = 'moderate'
    elif score >= 25:
        classification = 'poor'
    else:
        classification = 'critical'

    # Recommendations
    recommendations = []
    if score < 50:
        recommendations.append('Consider irrigation improvements — low vegetation vigor detected')
    if score < 30:
        recommendations.append('Urgent: Check for nutrient deficiency or pest damage')
    if ndvi < 0.15:
        recommendations.append('Very low NDVI — possible bare soil or crop failure')
    if ndvi > 0.5:
        recommendations.append('Healthy vegetation — maintain current practices')

    return {
        'predicted_ndvi': round(ndvi, 6),
        'health_score': score,
        'classification': classification,
        'recommendations': recommendations
    }
