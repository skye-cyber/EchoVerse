import os
import logging
import uuid
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.http import JsonResponse, FileResponse
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from django.conf import settings
from werkzeug.utils import secure_filename
from rest_framework.permissions import IsAuthenticated
from TTSStudio.models import TTSSession, TTSModel
from .processor import ttsfy
from .utils import allowed_file, extract_text_from_file

logger = logging.getLogger("studio")
User = get_user_model()


def dashboard(request):
    return render(request, "index.html")


class TTSView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Receive JSON {text: "...", voice: "...", speed: "..."} and return audio file"""

        data = request.get_json()
        if not data or "text" not in data:
            return JsonResponse({"error": "Missing 'text' field"}), 400

        text = data["text"]
        voice = data.get("voice", "default")
        speed = float(data.get("speed", 1.0))

        MODEL = TTSModel.objects.get(name="DEFAULT_TTS_MODEL")

        TTSSession.objects.create(
            user=request.user,
            input_text=text,
            speed=speed,
            model=MODEL,
        )
        buffer = ttsfy(text=text, voice=voice, speed=speed)

        return FileResponse(
            buffer, mimetype="audio/wav", filename="tts_output.wav", as_attachment=True
        )


# @login_required
@ensure_csrf_cookie
def FileTTSfy(request):
    """Handle TTS requests from the web interface with file upload support"""
    # Check if text was provided directly
    text = request.form.get("text", "")
    voice = request.form.get("voice", "default")
    speed = float(request.form.get("speed", 1.0))

    MODEL = TTSModel.objects.get(name="DEFAULT_TTS_MODEL")

    TTSSession.objects.create(
        user=request.user,
        input_text=text,
        speed=speed,
        model=MODEL,
    )
    # Check if a file was uploaded
    if "file" in request.files:
        file = request.files["file"]
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit(".", 1)[1].lower()

            # Save the file temporarily
            temp_path = os.path.join(
                settings.UPLOAD_PATH, f"{uuid.uuid4().hex}_{filename}"
            )
            file.save(temp_path)

            # Extract text from the file
            extracted_text = extract_text_from_file(temp_path, file_extension)

            # Clean up the temporary file
            try:
                os.remove(temp_path)
            except Exception:
                pass

            if extracted_text is not None:
                text = extracted_text
            else:
                return JsonResponse(
                    {"error": "Failed to extract text from the uploaded file"}
                ), 400

    if not text:
        return JsonResponse({"error": "No text provided"}), 400

    buffer = ttsfy(text=text, voice=voice, speed=speed)

    # Return the audio file directly to the browser
    return FileResponse(
        buffer,
        mimetype="audio/wav",
        as_attachment=False,
        filename="tts_output.wav",
    )


# TODO Implement Real Run for health checks
def health_check():
    """Health check endpoint"""
    return JsonResponse({"status": "healthy", "service": "tts-server"})
