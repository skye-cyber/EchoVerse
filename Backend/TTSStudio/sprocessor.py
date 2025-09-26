import io
import os
import glob
import torch
import warnings
import logging
import torchaudio
from datetime import datetime

# from django.conf import settings
from speechbrain.inference.TTS import FastSpeech2
from speechbrain.inference.vocoders import HIFIGAN

ptn_root = "/home/skye/EchoVerse/Backend/pretrained_models"  # settings.MODEL_ROOT

model_root = (
    "/home/skye/EchoVerse/Backend/pretrained_models/tts_models"  # settings.TTS_URL
)

hifigan_root = (
    "/home/skye/EchoVerse/Backend/pretrained_models/hifi_gan"  # settings.HIFIGAN_URL
)

CUSTOM_VOICES_DIR = os.path.join(
    "/home/skye/EchoVerse/Backend/", "voices"
)  # settings.BASE_DIR

# Suppress warnings globally
warnings.filterwarnings("ignore")

# Optional: make torch/torchaudio quieter
os.environ["TORCH_CPP_LOG_LEVEL"] = "ERROR"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# Suppress Flask logs (set to ERROR only)
log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)

warnings.filterwarnings("ignore", category=UserWarning, module="torchaudio")
warnings.filterwarnings("ignore", category=UserWarning, module="speechbrain")
warnings.filterwarnings("ignore", category=FutureWarning)

# Load models once at startup
fastspeech2 = FastSpeech2.from_hparams(
    source=model_root,
    savedir=model_root,
)
hifi_gan = HIFIGAN.from_hparams(
    source=hifigan_root,
    savedir=hifigan_root,
)

# Dictionary to store custom voice models
custom_voice_models = {}


def todict():
    for file in os.listdir(CUSTOM_VOICES_DIR):
        voice_path = os.path.join(CUSTOM_VOICES_DIR, file)
        output = os.path.join(CUSTOM_VOICES_DIR, f"{file.split(".")[0]}-dict.pt")
        tensor = torch.load(voice_path, map_location="cpu")

        # Wrap in dict format your code expects
        voice_dict = {"speaker_emb": tensor}

        torch.save(voice_dict, output)


def load_custom_voice(voice_id="bm_george"):
    """
    Load a custom voice model from .pt file

    Args:
        voice_id (str): The identifier of the voice to load

    Returns:
        dict: Loaded voice parameters or None if not found
    """
    # Check if voice is already loaded
    if voice_id in custom_voice_models:
        return custom_voice_models[voice_id]

    voice_path = os.path.join(CUSTOM_VOICES_DIR, f"{voice_id}-dict.pt")

    if not os.path.exists(voice_path):
        # Try to find with pattern matching
        pattern = os.path.join(CUSTOM_VOICES_DIR, f"*{voice_id}*-dict.pt")
        matches = glob.glob(pattern)
        if matches:
            voice_path = matches[0]
        else:
            print(f"Voice file not found: {voice_path}")
            return None

    try:
        # Load the custom voice parameters
        print(f"Loading voice from: {voice_path}")
        voice_data = torch.load(voice_path, map_location=torch.device("cpu"))

        # Ensure it's a dictionary with the expected structure
        if not isinstance(voice_data, dict):
            print(f"Voice file {voice_id}.pt does not contain a dictionary")
            return None

        # Cache the loaded voice data
        custom_voice_models[voice_id] = voice_data
        print(f"Successfully loaded voice: {voice_id}")
        return voice_data

    except Exception as e:
        print(f"Error loading voice {voice_id}: {e}")
        return None


def get_available_voices():
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


def apply_voice_parameters(model, voice_params):
    """
    Apply custom voice parameters to the TTS model

    Args:
        model: The TTS model to modify
        voice_params (dict): Voice parameters to apply

    Returns:
        model: Modified model
    """
    if voice_params is None:
        print("No voice parameters to apply")
        return model

    try:
        print("VOICE_PARAMS type:", type(voice_params))
        print(
            "VOICE_PARAMS keys:",
            voice_params.keys() if isinstance(voice_params, dict) else "Not a dict",
        )

        # Check if voice_params is actually a dictionary
        if not isinstance(voice_params, dict):
            print(f"Expected dict but got {type(voice_params)}")
            return model

        # Apply speaker embeddings if available
        if "speaker_emb" in voice_params and hasattr(model, "embeddings"):
            print("Applying speaker embeddings")
            # Check if embeddings dict exists and has speaker key
            if model.embeddings and "speaker" in model.embeddings:
                model.embeddings["speaker"].emb.weight.data = voice_params[
                    "speaker_emb"
                ]
            else:
                print("Model does not have speaker embeddings")

        # Apply pitch parameters - check if model has this attribute
        if "pitch_params" in voice_params:
            if hasattr(model, "pitch_predictor"):
                print("Applying pitch parameters")
                for param_name, param_value in voice_params["pitch_params"].items():
                    if hasattr(model.pitch_predictor, param_name):
                        param_obj = getattr(model.pitch_predictor, param_name)
                        if hasattr(param_obj, "data"):
                            param_obj.data = param_value
            else:
                print("Model does not have pitch_predictor")

        # Apply energy parameters
        if "energy_params" in voice_params:
            if hasattr(model, "energy_predictor"):
                print("Applying energy parameters")
                for param_name, param_value in voice_params["energy_params"].items():
                    if hasattr(model.energy_predictor, param_name):
                        param_obj = getattr(model.energy_predictor, param_name)
                        if hasattr(param_obj, "data"):
                            param_obj.data = param_value
            else:
                print("Model does not have energy_predictor")

        # Apply duration parameters
        if "duration_params" in voice_params:
            if hasattr(model, "duration_predictor"):
                print("Applying duration parameters")
                for param_name, param_value in voice_params["duration_params"].items():
                    if hasattr(model.duration_predictor, param_name):
                        param_obj = getattr(model.duration_predictor, param_name)
                        if hasattr(param_obj, "data"):
                            param_obj.data = param_value
            else:
                print("Model does not have duration_predictor")

        print("Voice parameters applied successfully")
        return model

    except Exception as e:
        print(f"Error applying voice parameters: {e}")
        import traceback

        traceback.print_exc()
        return model


def ttsfy(text, voice="default", speed=1.0) -> io.BytesIO:
    """
    Convert text to speech with optional custom voice

    Args:
        text (str): Text to convert to speech
        voice (str): Voice identifier ('default' or custom voice ID)
        speed (float): Speaking speed multiplier

    Returns:
        io.BytesIO: Audio buffer in WAV format
    """
    # Load custom voice if specified
    voice_params = None
    if voice != "default":
        print(f"Attempting to load custom voice: {voice}")
        voice_params = load_custom_voice(voice)
        if voice_params is None:
            print(f"Voice {voice} not found, using default voice")
        else:
            print(f"Successfully loaded voice parameters for: {voice}")

    # Use the original model (no copying needed for basic usage)
    current_model = fastspeech2

    # Apply voice parameters if available
    if voice_params is not None:
        print("Applying voice parameters to model...")
        current_model = apply_voice_parameters(current_model, voice_params)

    # Convert text to mel-spectrogram
    print("Encoding text to mel-spectrogram...")
    mel_output, _, _, _ = current_model.encode_text([text])

    # Convert mel to waveform
    print("Decoding mel-spectrogram to waveform...")
    waveform = hifi_gan.decode_batch(mel_output)

    # Apply speed adjustment if needed
    if speed != 1.0:
        print(f"Applying speed adjustment: {speed}x")
        waveform = torchaudio.functional.speed(waveform, orig_freq=22050, factor=speed)

    # Save to memory buffer
    buffer = io.BytesIO()
    torchaudio.save(buffer, waveform.squeeze(1).cpu(), 22050, format="wav")
    buffer.seek(0)

    print("TTS conversion completed successfully")
    return buffer


def inspect_voice_file(voice_id):
    """
    Utility function to inspect what's inside a voice file
    """
    voice_path = os.path.join(CUSTOM_VOICES_DIR, f"{voice_id}.pt")

    if not os.path.exists(voice_path):
        print(f"Voice file not found: {voice_path}")
        return None

    try:
        voice_data = torch.load(voice_path, map_location=torch.device("cpu"))
        print(f"Inspecting voice file: {voice_id}.pt")
        print(f"Type: {type(voice_data)}")

        if isinstance(voice_data, dict):
            print("Keys:", list(voice_data.keys()))
            for key, value in voice_data.items():
                print(
                    f"  {key}: {type(value)} - shape: {getattr(value, 'shape', 'No shape')}"
                )
        else:
            print(f"Content: {voice_data}")

        return voice_data
    except Exception as e:
        print(f"Error inspecting voice file: {e}")
        return None


# Additional utility functions
def create_voice_from_audio(audio_path, voice_id, reference_text=None):
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
        voice_path = os.path.join(CUSTOM_VOICES_DIR, f"{voice_id}.pt")
        os.makedirs(CUSTOM_VOICES_DIR, exist_ok=True)
        torch.save(dummy_voice_params, voice_path)

        # Add to loaded models
        custom_voice_models[voice_id] = dummy_voice_params

        print(f"Created dummy voice: {voice_id}")
        return True

    except Exception as e:
        print(f"Error creating voice: {e}")
        return False


def delete_custom_voice(voice_id):
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


if __name__ == "__main__":
    pass
    """
    # todict()
    # First, let's inspect what voices are available
    available_voices = get_available_voices()
    print("Available voices:", available_voices)

    # Inspect the bm_george voice file to see its structure
    if "bm_george" in available_voices:
        inspect_voice_file("bm_george")

    # Test text
    text = \"\"\"THE GREGORY RIFT VALLEY. This is the section with the most pronounced features of the Great Rift Valley.\"\"\"

    # Test with default voice first
    print("\n=== Testing with default voice ===")
    try:
        result = ttsfy(text, "default")
        if result:
            print("Default voice test: SUCCESS")
        else:
            print("Default voice test: FAILED")
    except Exception as e:
        print(f"Default voice test error: {e}")

    # Test with custom voice
    if "bm_george" in available_voices:
        print("\n=== Testing with bm_george voice ===")
        try:
            result = ttsfy(text, "bm_george")
            if result:
                print("Custom voice test: SUCCESS")
                # Save the result to a file
                with open("test_output_bm_george.wav", "wb") as f:
                    f.write(result.getvalue())
                print("Saved output to test_output_bm_george.wav")
            else:
                print("Custom voice test: FAILED")
        except Exception as e:
            print(f"Custom voice test error: {e}")
            import traceback

            traceback.print_exc()
"""
