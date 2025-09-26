import uuid


def generate_unique_id():
    """Generate a unique integer ID based on UUID4."""
    unique_id = uuid.uuid4().int
    return unique_id % (10**12)
