import uuid

# from werkzeug.utils import secure_filename
import PyPDF2
import docx
from pathlib import Path
import logging
from django.conf import settings
import os
import glob
import torch
from datetime import datetime
from TTSStudio.models import Voice, TTSModel
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from pydub import AudioSegment

logger = logging.getLogger("studio")

CUSTOM_VOICES_DIR = settings.BASE_DIR / "voices"
ALLOWED_EXTENSIONS = ("pdf", "doc", "docx", "txt")

custom_voice_models = {}


def allowed_file(filename) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_file(file_path, file_extension) -> str:
    """Extract text from different file types"""
    text = ""
    try:
        if file_extension == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        elif file_extension == "pdf":
            with open(file_path, "rb") as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        elif file_extension == "docx":
            doc = docx.Document(file_path)
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
    except Exception as e:
        logger.error(f"Error extracting text from file: {e}")
        return None

    return text


def generate_filename(relative=False) -> Path:
    try:
        os.makedirs(settings.UPLOAD_PATH / "tts_audio", exist_ok=True)

        filename = f"{uuid.uuid4().hex}.wav"
        if not relative:
            return settings.UPLOAD_PATH / "tts_audio" / filename

        return os.path.join(settings.UPLOAD_PATH, f"tts_audio/{filename}")
    except Exception:
        return False


def get_available_voices(type="list") -> list | dict:
    """
    Get list of available custom voices
    Returns:
        list: List of available voice IDs
    """
    if not os.path.exists(CUSTOM_VOICES_DIR):
        return []

    voice_files = glob.glob(os.path.join(CUSTOM_VOICES_DIR, "*.pt"))
    voices = [os.path.splitext(os.path.basename(f))[0] for f in voice_files]
    return voices


# Additional utility functions
def create_voice_from_audio(audio_path, voice_id, reference_text=None) -> bool:
    """
    Create a custom voice from audio sample (simplified version)
    This would typically require a voice cloning model

    Args:
        audio_path (str): Path to audio file
        voice_id (str): Identifier for the new voice
        reference_text (str): Optional reference text

    Returns:
        bool: Success status
    """
    try:
        # Create a simple voice parameter structure
        dummy_voice_params = {
            "speaker_emb": torch.randn(1, 256),  # Example embedding
            "metadata": {
                "source_audio": audio_path,
                "created_at": str(datetime.now()),
                "reference_text": reference_text,
            },
        }

        # Save voice parameters
        voice_path = CUSTOM_VOICES_DIR / f"{voice_id}.pt"

        os.makedirs(CUSTOM_VOICES_DIR, exist_ok=True)
        torch.save(dummy_voice_params, voice_path)

        # Add to loaded models
        custom_voice_models[voice_id] = dummy_voice_params

        print(f"Created dummy voice: {voice_id}")
        return True

    except Exception as e:
        print(f"Error creating voice: {e}")
        return False


def delete_custom_voice(voice_id) -> bool:
    """
    Delete a custom voice

    Args:
        voice_id (str): Voice identifier to delete

    Returns:
        bool: Success status
    """
    try:
        voice_path = os.path.join(CUSTOM_VOICES_DIR, f"{voice_id}.pt")

        if os.path.exists(voice_path):
            os.remove(voice_path)
            print(f"Deleted voice file: {voice_path}")

        # Remove from memory cache
        if voice_id in custom_voice_models:
            del custom_voice_models[voice_id]
            print(f"Removed voice from cache: {voice_id}")

        return True

    except Exception as e:
        print(f"Error deleting voice {voice_id}: {e}")
        return False


def populate_voices():
    for file in os.listdir(CUSTOM_VOICES_DIR):
        if not file.endswith("dict.pt"):
            fpath = os.path.realpath((CUSTOM_VOICES_DIR / file))
            language = "en-us" if "a" in file else "en-br"
            name = file.split(".", 1)[0].split("_")[-1]
            gender = (
                "male" if name in ("george", "michael", "lewis", "adam") else "female"
            )

            print("V:", file, "L:", language, "G:", gender, "P:", fpath)

            Voice.objects.get_or_create(
                name=name,
                file=fpath,
                language=language,
                gender=gender,
            )


def combine_temp_files(temp_files, output_filename):
    combined_audio = AudioSegment.empty()
    for temp_file in temp_files:
        audio_chunk = AudioSegment.from_wav(temp_file)
        combined_audio += audio_chunk
    combined_audio.export(output_filename, format="wav")
    print(f" Combined audio saved to \033[92m{output_filename}\033[0m")


def clean_up_temp_files(temp_files):
    for temp_file in temp_files:
        try:
            os.remove(temp_file)
        except FileNotFoundError:
            pass


def chunk_text(text, max_tokens=300, separator=" "):
    text = text.replace(":", ",").replace(";", ",").replace("-", ",")
    words = text.split(separator)
    chunks, current = [], ""
    for w in words:
        if len(current) + len(w) + 1 <= max_tokens:
            current += w + separator
        else:
            chunks.append(current.strip())
            current = w + separator
    if current.strip():
        chunks.append(current.strip())
    return chunks


def populate_voicesMD():
    from ttskit3.get_model import SuperTTS

    tts_model, created = TTSModel.objects.get_or_create(
        name="kitten-nano",
        language="en-us",
        gender="neutral",
        is_premium=False,
    )
    voices = SuperTTS().available_voices
    voices.append("null-voice")
    for voice in voices:
        Voice.objects.get_or_create(
            tts_model=tts_model,
            name=voice,
            language="en-us",
            gender="female"
            if voice.endswith("f")
            else "male"
            if voice.endswith("f")
            else "neutral",
        )


# populate_voices()
# populate_voicesMD()
