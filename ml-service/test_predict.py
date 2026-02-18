"""Quick test script — verifies model prediction works."""
from preprocessing import prepare_prediction_input, ndvi_to_health_score
from joblib import load

model = load('model/xgboost_model.joblib')
scaler = load('model/scaler.joblib')

# Sample farm data (similar to Farm1 in training set)
bands = {
    'B2': 1400, 'B3': 1600, 'B4': 1500, 'B5': 2000,
    'B6': 2800, 'B7': 3100, 'B8': 3200, 'B8A': 3100,
    'B11': 2500, 'B12': 2000
}
soil = {'clay': 380, 'nitrogen': 1800, 'ph': 71, 'sand': 300, 'soc': 160}

X = prepare_prediction_input(bands, soil, month=1)
X_scaled = scaler.transform(X)
pred = float(model.predict(X_scaled)[0])
result = ndvi_to_health_score(pred)

print(f"Predicted NDVI: {pred:.4f}")
print(f"Health Score:   {result['health_score']}")
print(f"Classification: {result['classification']}")
print(f"Recommendations: {result['recommendations']}")
print("\\n✅ Model prediction works!")
