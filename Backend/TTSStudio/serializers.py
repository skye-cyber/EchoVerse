from rest_framework import serializers
from .models import TTSModel, TTSSession, Voice


class TTSSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TTSSession
        fields = "__all__"


class TTSModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TTSModel
        fields = "__all__"


class VoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voice
        fields = "__all__"
