"""
gee_service.py — Google Earth Engine integration for live Sentinel-2 data.
Authenticates via service account and fetches band data for any polygon.
Falls back to CSV-based lookup or synthetic data if GEE is unavailable.
"""

import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

# GEE initialization state
_gee_initialized = False
_gee_error = None

def initialize_gee():
    """Initialize Google Earth Engine with service account credentials."""
    global _gee_initialized, _gee_error
    
    if _gee_initialized:
        return True

    try:
        import ee

        # Look for service account key file
        key_file = os.environ.get('GEE_KEY_FILE', 
                                   str(Path(__file__).parent / 'gee-service-account.json'))
        service_email = os.environ.get('GEE_SERVICE_ACCOUNT_EMAIL', '')

        if not os.path.exists(key_file):
            _gee_error = f'GEE key file not found: {key_file}'
            print(f'⚠️  {_gee_error}')
            return False

        # Read service account email from key file if not in env
        if not service_email:
            with open(key_file) as f:
                key_data = json.load(f)
                service_email = key_data.get('client_email', '')

        if not service_email:
            _gee_error = 'GEE service account email not found'
            print(f'⚠️  {_gee_error}')
            return False

        credentials = ee.ServiceAccountCredentials(service_email, key_file)
        ee.Initialize(credentials)
        _gee_initialized = True
        print(f'✅ Google Earth Engine initialized ({service_email})')
        return True

    except ImportError:
        _gee_error = 'earthengine-api not installed. Run: pip install earthengine-api'
        print(f'⚠️  {_gee_error}')
        return False
    except Exception as e:
        _gee_error = str(e)
        print(f'⚠️  GEE initialization failed: {_gee_error}')
        return False


def get_gee_status():
    """Return GEE connection status."""
    return {
        'initialized': _gee_initialized,
        'error': _gee_error,
        'service_email': os.environ.get('GEE_SERVICE_ACCOUNT_EMAIL', 'not set')
    }


def fetch_sentinel2_from_gee(polygon_coords, date_from=None, date_to=None):
    """
    Fetch Sentinel-2 L2A band data from GEE for a given polygon.
    
    Args:
        polygon_coords: list of [lng, lat] coordinate pairs forming a polygon
        date_from: start date string 'YYYY-MM-DD' (default: 30 days ago)
        date_to: end date string 'YYYY-MM-DD' (default: today)
    
    Returns:
        dict with 'bands' (mean reflectance values) and 'metadata'
    """
    if not _gee_initialized:
        if not initialize_gee():
            print('⚠️  GEE not available — using fallback')
            return _fallback_data(polygon_coords)

    try:
        import ee

        # Default date range: last 30 days
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        # Create GEE geometry from polygon coordinates
        roi = ee.Geometry.Polygon([polygon_coords])

        # Get Sentinel-2 L2A collection, filtered and cloud-masked
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(roi)
              .filterDate(date_from, date_to)
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
              .sort('CLOUDY_PIXEL_PERCENTAGE')
              .first())

        if s2 is None:
            print('⚠️  No Sentinel-2 imagery found for date range — widening search')
            # Try wider date range (90 days)
            date_from_wide = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
            s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterBounds(roi)
                  .filterDate(date_from_wide, date_to)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                  .sort('CLOUDY_PIXEL_PERCENTAGE')
                  .first())

        # Select bands we need (these are the ones in our training data)
        band_names = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']
        s2_bands = s2.select(band_names)

        # Compute mean band values over the polygon
        mean_values = s2_bands.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=10,  # 10m resolution for most bands
            maxPixels=1e9
        ).getInfo()

        if not mean_values or all(v is None for v in mean_values.values()):
            print('⚠️  GEE returned empty results — using fallback')
            return _fallback_data(polygon_coords)

        # Get acquisition date
        acq_date = datetime.fromtimestamp(
            s2.get('system:time_start').getInfo() / 1000
        ).strftime('%Y-%m-%d')

        # Build bands dict (values are in surface reflectance × 10000)
        bands = {}
        for band in band_names:
            val = mean_values.get(band)
            if val is not None:
                bands[band] = float(val)
            else:
                bands[band] = 0

        return {
            'bands': bands,
            'metadata': {
                'source': 'google-earth-engine',
                'collection': 'COPERNICUS/S2_SR_HARMONIZED',
                'date_from': date_from,
                'date_to': date_to,
                'acquisition_date': acq_date,
                'cloud_cover': s2.get('CLOUDY_PIXEL_PERCENTAGE').getInfo(),
                'n_bands': len(band_names)
            }
        }

    except Exception as e:
        print(f'⚠️  GEE fetch error: {e} — using fallback')
        return _fallback_data(polygon_coords)


def _fallback_data(polygon_coords):
    """
    Generate fallback data when GEE is unavailable.
    Uses the training CSV to find the closest farm data, or generates synthetic values.
    """
    csv_path = Path(__file__).parent / '4Farms_AllBands_AllIndices_2018_2024.csv'
    
    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            # Get the most recent observation per farm
            df['date'] = pd.to_datetime(df['date'])
            latest = df.sort_values('date', ascending=False).head(4)
            
            # Average the most recent observations
            band_cols = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']
            available_cols = [c for c in band_cols if c in latest.columns]
            means = latest[available_cols].mean()
            
            bands = {col: float(means[col]) for col in available_cols}
            
            return {
                'bands': bands,
                'metadata': {
                    'source': 'csv-fallback',
                    'note': 'Using averaged historical data from training CSV',
                    'n_samples_used': len(latest)
                }
            }
        except Exception as e:
            print(f'CSV fallback error: {e}')

    # Ultimate synthetic fallback
    seed = abs(hash(str(polygon_coords))) % 1000 / 1000.0
    bands = {
        'B2': 1400 + seed * 400,
        'B3': 1500 + seed * 300,
        'B4': 1300 + seed * 500,
        'B5': 1800 + seed * 400,
        'B6': 2500 + seed * 500,
        'B7': 2800 + seed * 500,
        'B8': 3000 + seed * 500,
        'B8A': 2900 + seed * 500,
        'B11': 2200 + seed * 500,
        'B12': 1800 + seed * 400
    }
    return {
        'bands': bands,
        'metadata': {
            'source': 'synthetic',
            'note': 'GEE unavailable. Configure GEE credentials for live data.'
        }
    }
