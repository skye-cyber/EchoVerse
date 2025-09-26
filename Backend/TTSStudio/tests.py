from django.test import TestCase, Client, RequestFactory
from django.contrib.auth import get_user_model
from TTSStudio.models import TTSModel
from pathlib import Path

User = get_user_model()


class TTSTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ttsfy", email="admin@example.com", password="testpass123"
        )

    def test_model_creation(self):
        """TTTS model creation"""
        model = TTSModel.objects.create(name="DEFAULT_TTS_MODEL", gender="Female")
        print(f"{model.name} created successfully")

    def test_text_ttsfy(self):
        text = " This is TTS test, voice default and speed normal. Accent default."
        response = self.client.post(
            "/studio/ttsfy/text",
            {"text": text, "voice": "default", "speed": 1.0},
        )
        print(f"Response: {response}")

    def test_file_ttsfy(self):
        text = " This is TTS test, voice default and speed normal. Accent default."
        file = Path("/home/skye/Documents/KCSE PPS/Geo.txt")

        response = self.client.post(
            "/studio/ttsfy/file",
            {"text": text, "voice": "default", "speed": 1.0},
            files=[file],
        )
        print(f"Response: {response}")
