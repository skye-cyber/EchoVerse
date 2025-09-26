import tempfile
from .utils import (
    get_available_voices,
    create_voice_from_audio,
    delete_custom_voice,
)
import json
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse, FileResponse, StreamingHttpResponse
import os
import logging
import uuid
from rest_framework.decorators import action
from rest_framework import status

# from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie  # , csrf_exempt
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from django.conf import settings
from werkzeug.utils import secure_filename
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from TTSStudio.models import TTSSession, TTSModel, Voice
from .utils import allowed_file, extract_text_from_file
from .serializers import TTSSessionSerializer, TTSModelSerializer, VoiceSerializer
import warnings
from .task_handler import process_text

warnings.filterwarnings("ignore")

logger = logging.getLogger("studio")
User = get_user_model()


class SessionManager(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, session_id):
        session = TTSSession.objects.filter(id=session_id).first()

        if not session:
            return Response(
                {"error": "Session with given id could not be found."}, status=404
            )

        process_text.delay(session_id)

        return Response({"task_id": session.id, "status": "processing"})

    def get(self, request):
        all_sessions = TTSSession.objects.filter(user=request.user)
        # subscription_plan = Subscription.filter(user=request.user).first().plan

        subscription_plan = "Free"

        # sess_data = []

        characters = sum(session.text_length for session in all_sessions)

        sorted_sessions = all_sessions.order_by("-created_at")

        session_data = []

        for session in sorted_sessions:
            path = (
                os.path.join(settings.BASE_DIR, session.audio_file.path)
                if session.audio_file and hasattr(session.audio_file, "path")
                else ""
            )
            entry = {
                "id": session.id,
                "voice": session.voice.name
                if hasattr(session.voice, "name")
                else "default",
                "input_text": session.input_text,
                "audio_file": {
                    "filename": session.filename,
                    "path": path,
                    # "blob": open(path) if os.path.exists(path) else "",
                },
                "created_at": session.created_at,
                "model": {"name": session.model.name},
                "text_length": session.text_length,
                "status": session.status,
            }
            session_data.append(entry)

        data = {
            "recent_activity": session_data[:10],
            "sessions": session_data,
            "total_conversions": all_sessions.count(),
            "characters": characters,
            "plan": subscription_plan,
        }

        return JsonResponse(data, status=200)

    def delete(self, request, session_id):
        session = TTSSession.objects.filter(id=session_id).first()

        if not session:
            return Response(
                {"error": "Session with given id could not be found."}, status=404
            )

        session.delete()

        return Response({"status": "success", "message": "Session Deleted"}, status=200)


class File2Blob(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = TTSSession.objects.filter(id=session_id).first()
        if not session:
            return Response(
                {
                    "error": "Session with given id not found",
                },
                status=404,
            )
        file = os.path.join(
            settings.BASE_DIR, session.audio_file.path.split("/media/")[-1]
        )

        if not os.path.exists(file):
            print(file, "Not Found")
            return JsonResponse(
                {
                    "error": "Requested Audio File Not Found in the system",
                },
                status=404,
            )

        # print("Blob ssid:", session_id)
        return FileResponse(
            open(file, "rb"), filename=session.filename, content_type="audio/wav"
        )


class FileDownload(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = TTSSession.objects.filter(id=session_id).first()
        if not session:
            return Response(
                {
                    "error": "Session with given id not found",
                },
                status=404,
            )
        file = os.path.join(
            settings.BASE_DIR, session.audio_file.path.split("/media/")[-1]
        )

        if not os.path.exists(file):
            print(file, "Not Found")
            return JsonResponse(
                {
                    "error": "Requested Audio File Not Found in the system",
                },
                status=404,
            )

        print("Downloading ssid:", session_id)
        return FileResponse(
            open(file, "rb"),
            filename=session.filename,
            as_attachment=True,
            content_type="audio/wav",
        )


class TextTTSfy(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Receive JSON {text: "...", voice: "...", speed: "..."} and return audio file"""

        text = request.data["text"]
        voice = request.data.get("voice", "default")
        speed = float(request.data.get("speed", 1.0))
        pitch = float(request.data.get("pitch", 1.0))
        energy = float(request.data.get("energy", 1.0))

        if not text:
            return JsonResponse({"error": "Missing 'text' field"}), 400

        MODEL = TTSModel.objects.get(name="DEFAULT_TTS_MODEL")

        # Save to session history if user is authenticated
        session, created = TTSSession.objects.get_or_create(
            user=request.user,
            input_text=text,
            speed=speed,
            model=MODEL,
            energy=energy,
            pitch=pitch,
        )
        if created:
            session.save()

        print(f"\033[33mDispatched task {session.id}\033[0m")
        # Call the background celery task handler
        process_text.delay(session.id)

        return Response({"task_id": session.id, "status": "processing"})

    def get(self, request):
        models = TTSModel.objects.all()
        serializer = TTSModelSerializer(models, many=True)
        return Response(serializer.data)


# @login_required
@api_view(["post"])
@ensure_csrf_cookie
def FileTTSfy(request):
    """Handle TTS requests from the web interface with file upload support"""
    # Check if text was provided directly
    text = request.data["text"]
    voice = request.data["voice"] or "default"
    speed = float(request.data["speed"] or 1.0)
    pitch = float(request.data["pitch"] or 1.0)
    energy = float(request.data["energy"] or 1.0)

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

    MODEL = TTSModel.objects.get(name="DEFAULT_TTS_MODEL")

    # Save to session history if user is authenticated
    session = TTSSession.objects.get_or_create(
        user=request.user,
        input_text=text,
        speed=speed,
        model=MODEL,
        energy=energy,
        pitch=pitch,
    )

    # Call the background celery task handler
    process_text.delay(session.id)

    return Response({"task_id": session.id, "status": "processing"})


class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        try:
            task = TTSSession.objects.get(id=task_id)

            if task.status == "pending":
                return Response(
                    {"status": "pending", "message": "Task still processing"},
                    status=202,
                )
            if task.status == "processing":
                return Response(
                    {"status": "pending", "message": "Task still processing"},
                    status=202,
                )
            elif task.status in ("error", "failed"):
                return Response(
                    {"status": "failed", "error": task.error_message}, status=202
                )
            elif task.status in ("completed", "processed"):
                return FileResponse(
                    open(task.audio_file.path, "rb"),
                    content_type="audio/wav",
                    as_attachment=False,
                )

            return Response({"error": "Invalid task status"}, status=400)

        except TTSSession.DoesNotExist:
            return Response({"error": f"Task {task_id} not found"}, status=404)


class TTSSessionViewSet(viewsets.ModelViewSet):
    serializer_class = TTSSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TTSSession.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# TODO Implement Real Run for health checks
def health_check():
    """Health check endpoint"""
    return JsonResponse({"status": "healthy", "service": "tts-server"})


@csrf_exempt
@require_http_methods(["POST"])
def tts_api(request):
    """Text-to-speech API endpoint"""
    try:
        data = json.loads(request.body)
        text = data.get("text", "")
        voice = data.get("voice", "default")
        speed = float(data.get("speed", 1.0))

        if not text:
            return JsonResponse({"error": "Text is required"}, status=400)

        # Generate audio
        audio_buffer = ttsfy(text, voice, speed)

        # Return audio file
        response = HttpResponse(audio_buffer.getvalue(), content_type="audio/wav")
        response["Content-Disposition"] = (
            f'attachment; filename="tts_output_{voice}.wav"'
        )
        return response

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def list_voices(request):
    """Get list of available voices"""
    data = Voice.objects.all()
    voices = []
    for voice in data:
        voices.append(
            {
                "id": voice.id,
                "name": voice.name,
                "is_premium": voice.is_premium,
                "language": voice.language,
            }
        )
    return JsonResponse({"voices": voices})


@csrf_exempt
@require_http_methods(["POST"])
def create_voice(request):
    """Create a new custom voice from audio upload"""
    try:
        if "audio" not in request.FILES:
            return JsonResponse({"error": "Audio file is required"}, status=400)

        voice_id = request.POST.get("voice_id", "")
        reference_text = request.POST.get("reference_text", "")

        if not voice_id:
            return JsonResponse({"error": "Voice ID is required"}, status=400)

        # Save uploaded file temporarily
        audio_file = request.FILES["audio"]
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            for chunk in audio_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        # Create voice (this is a simplified version)
        success = create_voice_from_audio(tmp_path, voice_id, reference_text)

        # Clean up temporary file
        os.unlink(tmp_path)

        if success:
            return JsonResponse({"message": f"Voice {voice_id} created successfully"})
        else:
            return JsonResponse({"error": "Failed to create voice"}, status=500)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["DELETE"])
@csrf_exempt
def delete_voice(request, voice_id):
    """Delete a custom voice"""
    try:
        success = delete_custom_voice(voice_id)

        if success:
            return JsonResponse({"message": f"Voice {voice_id} deleted successfully"})
        else:
            return JsonResponse({"error": f"Voice {voice_id} not found"}, status=404)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
