"""
app.py — FastAPI application for crop health prediction.
Serves the trained XGBoost model for real-time predictions.
Integrates with Google Earth Engine for live Sentinel-2 data.
"""

import json
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from joblib import load
import numpy as np

from preprocessing import (
    prepare_prediction_input, ndvi_to_health_score, MODEL_DIR
)
from gee_service import initialize_gee, get_gee_status, fetch_sentinel2_from_gee

# ---------- FastAPI App ----------
app = FastAPI(
    title='AgriSense ML Service',
    description='XGBoost crop health prediction using Sentinel-2 satellite data + Google Earth Engine',
    version='2.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ---------- Load Model ----------
model = None
scaler = None
feature_columns = None
metadata = None


def load_model():
    global model, scaler, feature_columns, metadata
    model_path = MODEL_DIR / 'xgboost_model.joblib'
    scaler_path = MODEL_DIR / 'scaler.joblib'
    features_path = MODEL_DIR / 'feature_columns.joblib'
    metadata_path = MODEL_DIR / 'metadata.json'

    if not model_path.exists():
        print('⚠️  Model not found. Run "python train.py" first.')
        return False

    model = load(model_path)
    scaler = load(scaler_path)
    feature_columns = load(features_path)

    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)

    print(f'✅ Model loaded: {len(feature_columns)} features')
    return True


# ---------- Request/Response Models ----------
class BandData(BaseModel):
    B2: float = Field(..., description='Blue (490nm)')
    B3: float = Field(..., description='Green (560nm)')
    B4: float = Field(..., description='Red (665nm)')
    B5: float = Field(0, description='Red Edge 1 (705nm)')
    B6: float = Field(0, description='Red Edge 2 (740nm)')
    B7: float = Field(0, description='Red Edge 3 (783nm)')
    B8: float = Field(..., description='NIR (842nm)')
    B8A: float = Field(0, description='Narrow NIR (865nm)')
    B11: float = Field(0, description='SWIR 1 (1610nm)')
    B12: float = Field(0, description='SWIR 2 (2190nm)')
    EVI: Optional[float] = None
    NDWI: Optional[float] = None
    SAVI: Optional[float] = None


class SoilData(BaseModel):
    clay: float = Field(0, description='Clay content (g/kg)')
    nitrogen: float = Field(0, description='Nitrogen content (cg/kg)')
    ph: float = Field(0, description='pH in H2O (×10)')
    sand: float = Field(0, description='Sand content (g/kg)')
    soc: float = Field(0, description='Soil organic carbon (dg/kg)')


class PredictRequest(BaseModel):
    bands: BandData
    soil: Optional[SoilData] = None
    month: Optional[int] = Field(None, ge=1, le=12)


class PolygonPredictRequest(BaseModel):
    polygon: List[List[float]] = Field(
        ..., description='Polygon coordinates as [[lng, lat], [lng, lat], ...]. Must be closed (first == last).'
    )
    soil: Optional[SoilData] = None
    date_from: Optional[str] = Field(None, description='Start date YYYY-MM-DD')
    date_to: Optional[str] = Field(None, description='End date YYYY-MM-DD')


class BatchPredictRequest(BaseModel):
    samples: List[PredictRequest]


class PredictionResponse(BaseModel):
    predicted_ndvi: float
    health_score: int
    classification: str
    recommendations: List[str]


# ---------- Endpoints ----------
@app.on_event('startup')
async def startup():
    load_model()
    # Try to initialize GEE (non-blocking — will fallback if fails)
    initialize_gee()


@app.get('/health')
async def health_check():
    gee = get_gee_status()
    return {
        'status': 'healthy',
        'model_loaded': model is not None,
        'gee_connected': gee['initialized'],
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
    }


@app.post('/predict', response_model=PredictionResponse)
async def predict(req: PredictRequest):
    """Predict crop health from pre-fetched band + soil data."""
    if model is None:
        raise HTTPException(status_code=503, detail='Model not loaded. Run train.py first.')

    band_dict = req.bands.model_dump()
    soil_dict = req.soil.model_dump() if req.soil else None

    X = prepare_prediction_input(band_dict, soil_dict, req.month)
    X_scaled = scaler.transform(X)
    ndvi_pred = float(model.predict(X_scaled)[0])
    result = ndvi_to_health_score(ndvi_pred)
    return result


@app.post('/predict/polygon')
async def predict_polygon(req: PolygonPredictRequest):
    """
    Full pipeline: Accept polygon → Fetch live Sentinel-2 data via GEE → Predict crop health.
    Falls back to CSV/synthetic data if GEE is unavailable.
    """
    if model is None:
        raise HTTPException(status_code=503, detail='Model not loaded. Run train.py first.')

    # 1. Fetch Sentinel-2 data from GEE (or fallback)
    gee_result = fetch_sentinel2_from_gee(
        polygon_coords=req.polygon,
        date_from=req.date_from,
        date_to=req.date_to
    )
    bands = gee_result['bands']

    # 2. Build soil dict
    soil_dict = req.soil.model_dump() if req.soil else None

    # 3. Prepare features and predict
    X = prepare_prediction_input(bands, soil_dict, datetime.now().month)
    X_scaled = scaler.transform(X)
    ndvi_pred = float(model.predict(X_scaled)[0])
    health = ndvi_to_health_score(ndvi_pred)

    return {
        **health,
        'satellite_data': {
            'source': gee_result['metadata'].get('source', 'unknown'),
            'bands': bands,
            'metadata': gee_result['metadata']
        }
    }


@app.post('/predict/batch')
async def predict_batch(req: BatchPredictRequest):
    """Batch prediction for multiple samples."""
    if model is None:
        raise HTTPException(status_code=503, detail='Model not loaded. Run train.py first.')

    results = []
    for sample in req.samples:
        band_dict = sample.bands.model_dump()
        soil_dict = sample.soil.model_dump() if sample.soil else None
        X = prepare_prediction_input(band_dict, soil_dict, sample.month)
        X_scaled = scaler.transform(X)
        ndvi_pred = float(model.predict(X_scaled)[0])
        results.append(ndvi_to_health_score(ndvi_pred))

    return {'predictions': results, 'count': len(results)}


@app.get('/model/info')
async def model_info():
    """Return model metadata and performance metrics."""
    if metadata is None:
        raise HTTPException(status_code=503, detail='Model metadata not found.')
    return {
        'target': metadata.get('target'),
        'n_features': metadata.get('n_features'),
        'metrics': metadata.get('metrics'),
        'top_features': metadata.get('top_features'),
        'feature_columns': metadata.get('feature_columns')
    }


@app.get('/gee/status')
async def gee_status():
    """Check Google Earth Engine connection status."""
    status = get_gee_status()
    return {
        'connected': status['initialized'],
        'service_account': status['service_email'],
        'error': status['error']
    }


class GEEFetchRequest(BaseModel):
    polygon: List[List[float]] = Field(
        ..., description='Polygon coordinates as [[lng, lat], ...]. Must be closed.'
    )
    date_from: Optional[str] = Field(None, description='Start date YYYY-MM-DD')
    date_to: Optional[str] = Field(None, description='End date YYYY-MM-DD')


@app.post('/gee/fetch')
async def gee_fetch(req: GEEFetchRequest):
    """
    Fetch raw Sentinel-2 band data from GEE (or fallback) without running prediction.
    Used by the Node.js backend for analysis engine computations.
    """
    gee_result = fetch_sentinel2_from_gee(
        polygon_coords=req.polygon,
        date_from=req.date_from,
        date_to=req.date_to
    )
    return {
        'bands': gee_result['bands'],
        'metadata': gee_result['metadata']
    }


# ---------- Run ----------
if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app:app', host='0.0.0.0', port=5001, reload=True)
