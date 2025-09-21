import tempfile
import uuid
from werkzeug.utils import secure_filename
import PyPDF2
import docx


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_file(file_path, file_extension):
    """Extract text from different file types"""
    text = ""
    try:
        if file_extension == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        elif file_extension == "pdf":
            with open(file_path, "rb") as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        elif file_extension == "docx":
            doc = docx.Document(file_path)
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
    except Exception as e:
        app.logger.error(f"Error extracting text from file: {e}")
        return None

    return text
