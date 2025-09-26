import os
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
