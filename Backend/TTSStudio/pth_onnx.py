from pathlib import Path
import torch
import torch.nn as nn
import torch.nn.functional as F
import onnx
from onnxsim import simplify
import json

# Define the model architecture based on the config


class LayerNorm(nn.Module):
    def __init__(self, channels, eps=1e-5):
        super().__init__()
        self.channels = channels
        self.eps = eps
        self.gamma = nn.Parameter(torch.ones(channels))
        self.beta = nn.Parameter(torch.zeros(channels))

    def forward(self, x):
        x = x.transpose(1, -1)
        x = F.layer_norm(x, (self.channels,), self.gamma, self.beta, self.eps)
        return x.transpose(1, -1)


class TextEncoder(nn.Module):
    def __init__(self, channels, kernel_size, depth, n_symbols, actv=nn.LeakyReLU(0.2)):
        super().__init__()
        self.embedding = nn.Embedding(n_symbols, channels)

        padding = (kernel_size - 1) // 2
        self.cnn = nn.ModuleList()
        for _ in range(depth):
            self.cnn.append(
                nn.Sequential(
                    nn.utils.weight_norm(
                        nn.Conv1d(
                            channels, channels, kernel_size=kernel_size, padding=padding
                        )
                    ),
                    LayerNorm(channels),
                    actv,
                    nn.Dropout(0.2),
                )
            )

        self.lstm = nn.LSTM(
            channels, channels // 2, 1, batch_first=True, bidirectional=True
        )

    def forward(self, x, input_lengths, m):
        x = self.embedding(x)  # [B, T, emb]
        x = x.transpose(1, 2)  # [B, emb, T]
        m = m.to(input_lengths.device).unsqueeze(1)
        x.masked_fill_(m, 0.0)

        for c in self.cnn:
            x = c(x)
            x.masked_fill_(m, 0.0)

        x = x.transpose(1, 2)  # [B, T, chn]

        # Use PyTorch's native length handling instead of numpy conversion
        x = nn.utils.rnn.pack_padded_sequence(
            x, input_lengths, batch_first=True, enforce_sorted=False
        )

        self.lstm.flatten_parameters()
        x, _ = self.lstm(x)
        x, _ = nn.utils.rnn.pad_packed_sequence(x, batch_first=True)

        x = x.transpose(-1, -2)
        x_pad = torch.zeros([x.shape[0], x.shape[1], m.shape[-1]], device=x.device)
        x_pad[:, :, : x.shape[-1]] = x
        x = x_pad

        x.masked_fill_(m, 0.0)
        return x


def convert_to_onnx():
    # Load config
    config_path = Path(__file__).parent.parent / "config.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    # Load half-precision weights
    half_path = Path(
        "/home/skye/EchoVerse/Backend/TTSStudio/pretrained_models/tts_models/model.ckpt"
    )
    assert half_path.exists(), f"No half-precision weights found at {half_path}"

    checkpoint = torch.load(half_path, map_location="cpu", weights_only=True)
    net_weights = checkpoint["net"]

    # Create model instance
    model = TextEncoder(
        channels=config["hidden_dim"],
        kernel_size=5,
        depth=config["n_layer"],
        n_symbols=config["n_token"],
    )

    # Load weights into the model
    print("Loading weights into model...")

    # Extract text_encoder weights (they typically start with 'text_encoder.')
    text_encoder_weights = {}
    for key, value in net_weights.items():
        if key.startswith("text_encoder."):
            # Remove 'text_encoder.' prefix and load into model
            param_name = key[len("text_encoder.") :]
            text_encoder_weights[param_name] = value

    # Load weights with strict=False to handle any mismatches
    model.load_state_dict(text_encoder_weights, strict=False)
    model.eval()

    # Convert to half precision
    model = model.half()

    # Create dummy inputs
    batch_size = 1
    seq_len = 32

    dummy_input_ids = torch.randint(
        0, config["n_token"], (batch_size, seq_len), dtype=torch.long
    )
    dummy_input_lengths = torch.tensor([seq_len], dtype=torch.long)
    dummy_mask = torch.zeros(batch_size, seq_len, dtype=torch.bool)

    print(
        f"Input shapes: ids={dummy_input_ids.shape}, lengths={dummy_input_lengths.shape}, mask={dummy_mask.shape}"
    )

    # Test forward pass
    with torch.no_grad():
        output = model(dummy_input_ids, dummy_input_lengths, dummy_mask)
        print(f"Output shape: {output.shape}")

    # Export to ONNX
    onnx_path = "text_encoder.onnx"

    torch.onnx.export(
        model,
        (dummy_input_ids, dummy_input_lengths, dummy_mask),
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input_ids", "input_lengths", "mask"],
        output_names=["output"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "input_lengths": {0: "batch_size"},
            "mask": {0: "batch_size", 1: "sequence_length"},
            "output": {0: "batch_size", 1: "channels", 2: "sequence_length"},
        },
        verbose=True,
    )

    print(f"TextEncoder ONNX model saved to: {onnx_path}")

    # Simplify the ONNX model
    try:
        onnx_model = onnx.load(onnx_path)
        model_simp, check = simplify(onnx_model)
        assert check, "Simplified model check failed"

        simplified_path = "text_encoder_simplified.onnx"
        onnx.save(model_simp, simplified_path)
        print(f"Simplified ONNX model saved to: {simplified_path}")

    except Exception as e:
        print(f"Simplification failed: {e}")
        simplified_path = onnx_path

    # Verify the model
    try:
        onnx_model = onnx.load(simplified_path)
        onnx.checker.check_model(onnx_model)
        print("ONNX model is valid!")

        # Check file size
        file_size = Path(simplified_path).stat().st_size
        print(f"ONNX file size: {file_size / (1024 * 1024):.2f} MB")

    except onnx.checker.ValidationError as e:
        print(f"ONNX model validation failed: {e}")

    return True


if __name__ == "__main__":
    success = convert_to_onnx()
    if success:
        print("TextEncoder ONNX conversion completed successfully!")
    else:
        print("ONNX conversion failed!")
