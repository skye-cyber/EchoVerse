from .tts_utils.generator import phonemize, tokenize
import numpy as np
import torch
import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_static, CalibrationDataReader, QuantType, QuantFormat
from pathlib import Path
# ==== PIPELINE HOOKS ====
# sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

# === CONFIG ===
base_dir = Path(__file__).parent

onnx_fp32 = base_dir.parent / "models/full-tts-v0_19.onnx"
onnx_infershapes = base_dir.parent / "models/tts-v0-19-infershapes.onnx"
onnx_int8 = base_dir.parent / "models/tts-v0_19-int8.onnx"

# pick a few simple sentences for calibration
CALIBRATION_TEXTS = [
    "Hi",
    "How are you?"
    "Hello world, this is Kokoro.",
    "Testing the speech synthesis model.",
    "Optimization and quantization improve speed.",
    "We are calibrating the model for INT8 inference.",
    "There are just 3 aspects of universal reality, these are, fact, idea and relation."
]

voicepack = torch.load(base_dir.parent / "voices/bm_george.pt", map_location="cpu")


# === Calibration DataReader ===
class DataReader(CalibrationDataReader):
    def __init__(self, texts, voicepack):
        self.enum_data = self._prepare_data(texts, voicepack)

    def _prepare_data(self, texts, voicepack):
        samples = []
        for text in texts:
            # tokenize
            ps = phonemize(text, "a")
            tokens = tokenize(ps)
            if not tokens:
                continue

            tokens = np.array(tokens, dtype=np.int64).reshape(1, -1)

            # pick first style vector
            ref_s = voicepack[0]
            if isinstance(ref_s, torch.Tensor):
                ref_s = ref_s.cpu().numpy().astype(np.float32)
            if ref_s.ndim == 1:
                ref_s = ref_s.reshape(1, -1)

            speed = np.array([1.0], dtype=np.float32)

            samples.append({
                "tokens": tokens,
                "style": ref_s,
                "speed": speed
            })

        return iter(samples)

    def get_next(self):
        return next(self.enum_data, None)


# === Quantization ===
def quantize_model():
    """
    Quantize only MatMul and Gemm ops to INT8 (leave Conv layers intact)
    """
    print("[*] Loading model...")
    model = onnx.load(onnx_fp32)
    # model = onnx.shape_inference.infer_shapes(model)
    # onnx.save(model, onnx_infershapes)

    dr = DataReader(CALIBRATION_TEXTS, voicepack)

    print(f"Original size: {onnx_fp32.stat().st_size/1e6:.1f} MB")

    print("[*] Applying selective INT8 quantization...")

    # Restrict op types to quantize — avoid LayerNorm, LSTM, etc.
    op_types_to_quantize = ["MatMul", "Gemm"]  # skips convolution-like layers that cause noise distortion.

    quantize_static(
        model_input=model,
        model_output=onnx_int8,
        calibration_data_reader=dr,
        op_types_to_quantize=op_types_to_quantize,
        weight_type=QuantType.QInt8,
        activation_type=QuantType.QInt8,
        quant_format=QuantFormat.QDQ,   # QDQ often more portable
        per_channel=False,  # safer: avoid per-channel issues
        reduce_range=True
    )

    print(f"[✔] Quantized model saved: {onnx_int8}")
    print(f"New size: {onnx_int8.stat().st_size/1e6:.1f} MB")


if __name__ == "__main__":
    quantize_model()
