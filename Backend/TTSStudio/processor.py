import io
import os
import torchaudio
from speechbrain.inference.TTS import FastSpeech2
from speechbrain.inference.vocoders import HIFIGAN
import warnings

import logging
from django.conf import settings

ptn_root = settings.MODEL_ROOT
model_root = settings.TTS_URL
hifigan_root = settings.HIFIGAN_URL

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


def ttsfy(text, voice, speed) -> io.BytesIO:
    # Apply voice and speed adjustments (placeholder for future implementation)
    # For now, we'll use the standard model without modifications
    # In a production system, you would adjust parameters based on these values

    # Convert text to mel-spectrogram
    mel_output, _, _, _ = fastspeech2.encode_text([text])

    # Convert mel to waveform
    waveform = hifi_gan.decode_batch(mel_output)

    # Apply speed adjustment if needed (this is a simplified approach)
    # In a real implementation, you might use different techniques
    if speed != 1.0:
        # This is a placeholder - actual speed adjustment would require
        # more sophisticated audio processing
        waveform = torchaudio.functional.speed(waveform, orig_freq=22050, factor=speed)

    # Save to memory (instead of disk)
    buffer = io.BytesIO()
    torchaudio.save(buffer, waveform.squeeze(1).cpu(), 22050, format="wav")
    buffer.seek(0)

    # Return as file
    return buffer
