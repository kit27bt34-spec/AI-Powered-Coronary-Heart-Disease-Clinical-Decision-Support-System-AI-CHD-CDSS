import unittest
import requests

BASE_URL = "http://localhost:8000"

class TestEnterpriseSuite(unittest.TestCase):
    def setUp(self):
        self.session = requests.Session()
        # Login to get JWT token
        resp = self.session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "doctor@hospital.org", "password": "password123"}
        )
        self.assertEqual(resp.status_code, 200, "Doctor login failed")
        token = resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_health_check(self):
        resp = requests.get(f"{BASE_URL}/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("status"), "healthy")

    def test_liveness_probe(self):
        resp = requests.get(f"{BASE_URL}/health/live")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("status"), "alive")

    def test_readiness_probe(self):
        resp = requests.get(f"{BASE_URL}/health/ready")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("database"), "connected")

    def test_prometheus_metrics(self):
        resp = requests.get(f"{BASE_URL}/metrics")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("chd_cdss_http_requests_total", resp.text)

    def test_patient_list_scoped(self):
        resp = self.session.get(f"{BASE_URL}/api/v1/patients?hospital=st-jude-memorial")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_chd_prediction_engine(self):
        payload = {
            "age": 62, "gender": 1, "bmi": 29.5, "systolic_bp": 145, "diastolic_bp": 92,
            "heart_rate": 84, "glucose": 155, "cholesterol": 235, "hypertension": 1,
            "diabetes": 1, "smoking": 1, "previous_cardiac": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/v1/predict", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue("calibrated_probability" in data or "chd_risk_score" in data)
        self.assertTrue("risk_level" in data or "risk_category" in data)

    def test_disaster_recovery_backup_and_pitr(self):
        from scripts.disaster_recovery import generate_automated_backup, validate_backup_integrity, execute_pitr_restore
        path = generate_automated_backup()
        self.assertTrue(validate_backup_integrity(path))
        self.assertTrue(execute_pitr_restore(path))

    def test_phi_log_masking(self):
        from backend.middleware.phi_masking import PHIMaskingFilter
        raw_log = "Patient doctor@hospital.org registered with phone 555-123-4567 and SSN 123-45-6789."
        masked = PHIMaskingFilter.mask_phi(raw_log)
        self.assertNotIn("doctor@hospital.org", masked)
        self.assertNotIn("555-123-4567", masked)
        self.assertNotIn("123-45-6789", masked)

    def test_feature_flag_service(self):
        from backend.services.feature_flag_service import FeatureFlagService
        self.assertTrue(FeatureFlagService.is_feature_enabled("enable_catboost_v9"))
        FeatureFlagService.set_feature_flag("test_flag", True)
        self.assertTrue(FeatureFlagService.is_feature_enabled("test_flag"))

    def test_champion_challenger_shadow_inference(self):
        from mlops.champion_challenger import ChampionChallengerEvaluator
        res = ChampionChallengerEvaluator.evaluate_shadow_prediction({"age": 60})
        self.assertIn("champion", res)
        self.assertIn("challenger", res)
        self.assertEqual(res["champion"]["model"], "CatBoost (v9)")

    def test_api_gateway_correlation_id(self):
        resp = requests.get(f"{BASE_URL}/health")
        self.assertIn("X-Correlation-ID", resp.headers)

if __name__ == "__main__":
    unittest.main()
