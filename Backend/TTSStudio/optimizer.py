from pathlib import Path
import torch
import onnx
import onnxruntime as ort
from onnxruntime.quantization import (
    quantize_dynamic,
    quantize_static,
    QuantType,
    QuantFormat,
)

# from .quantize import quantize_model as quantize_int8
from onnxconverter_common import float16

# Paths
base_dir = Path(__file__).parent.parent / "pretrained_models"

onnx_fp32 = base_dir / "tts_models/model.ckpt"  # "models/full-tts-v0_19.onnx"
onnx_int8 = base_dir / "tts_models/tts-v0_19-int8.onnx"
onnx_fp16 = base_dir / "tts_models/tts-v0_19-fp16.onnx"


def export_fp16():
    """Convert ONNX model weights from FP32 to FP16."""
    model = onnx.load(onnx_fp32)
    # Convert to FP16 (preserves opset and structure, just changes tensor dtype)
    model_fp16 = float16.convert_float_to_float16(model)
    onnx.save(model_fp16, onnx_fp16)
    print(f"[✔] Exported FP16 ONNX → {onnx_fp16}")


def optimize_graph():
    """Apply ONNX Runtime graph optimizations."""
    so = ort.SessionOptions()
    so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    ort_session = ort.InferenceSession(
        onnx_fp32,
        sess_options=so,
        providers=["CPUExecutionProvider"],
    )
    print(
        f"[✔] Graph optimizations enabled (fusions, constant folding, etc.) ->{onnx_fp32}"
    )
    return ort_session


def runner():
    # Step 1: Graph optimization (fuses ops in fp32 model)
    # optimize_graph()

    # Step 2: Quantize (INT8 with QDQ/QLinearConv)
    # quantize_int8()

    # Optional: Export FP16 for fallback
    export_fp16()


if __name__ == "__main__":
    runner()
