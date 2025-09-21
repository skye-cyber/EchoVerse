from rest_framework import serializers
from .models import EchoVerseUser, VerificationToken, ResetToken


class EchoVerseUserSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = EchoVerseUser
        fields = ("username", "email", "password1", "password2", "account_type")

    def validate(self, data):
        if data["password1"] != data["password2"]:
            raise serializers.ValidationError("Passwords do not match.")

        return data

    def create(self, validated_data):
        password = validated_data.pop("password1")
        validated_data.pop("password2")
        user = EchoVerseUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class VerificationTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationToken
        fields = "__all__"


class ResetTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResetToken
        fields = "__all__"
