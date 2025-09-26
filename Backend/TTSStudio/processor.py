import torchaudio
from pathlib import Path
from tqdm.asyncio import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from multiprocessing import cpu_count
from .utils import (
    generate_filename,
    combine_temp_files,
    clean_up_temp_files,
    chunk_text,
)
import logging

log = logging.getLogger("EchoVerse")


class Processor:
    """Process text input into speech safely with optional multithreading.

    Args:
        text (str): Input text to process.
        voice (str): voice to be used -> maps voice provided by the system
        speed (float): for scaling up/down the speed of speaker
        pitch (float): for scaling up/down the pitch of the speaker
        energy (float): scales the energy of the speaker
        threads (int): Number of threads to use for parallel processing.
    """

    def __init__(self, text, voice, speed=1.0, pitch=1.0, energy=1.0, threads: int = 1):
        self.text = text
        self.voice = voice
        self.speed = speed
        self.pitch = pitch
        self.energy = energy
        self.threads = threads
        self.chunks = chunk_text(self.text)
        self.output_file = generate_filename(relative=True)
        from .initializer import hifi_gan, fastspeech2

        self.hifi_gan = hifi_gan
        self.fastspeech2 = fastspeech2

    def MultiThreadedProcessor(self):
        """Process text input into speech safely with optional multithreading.

        Args:
            text (str): Input text to process.
            output_file (str): Path to final output audio file.
            threads (int): Number of threads to use for parallel processing.
        """
        self.threads = (
            (cpu_count() - 1) if (self.threads > cpu_count()) else self.threads
        )

        tmp_files = []
        log.info("Processing threads:", self.threads)
        if self.threads > 1:
            with ThreadPoolExecutor(max_workers=self.threads) as executor:
                futures = {
                    executor.submit(
                        self.ttsfy,
                        chunk,
                        self.speed,
                        f"{self.output_file.split('.')[0]}-tmp-{i}.wav",
                    ): i
                    for i, chunk in enumerate(self.chunks, start=1)
                }

                for future in tqdm(
                    as_completed(futures),
                    total=len(futures),
                    desc="Chunks",
                    leave=False,
                ):
                    i = futures[future]
                    try:
                        tmp_name = f"{self.output_file.split('.')[0]}-tmp-{i}.wav"
                        future.result()  # raises exception if ttsfy failed
                        tmp_files.append(tmp_name)
                    except Exception as e:
                        # raise
                        log.exception(f"\033[31mError in chunk {i}\033[0m: {e}")
        else:
            # single-thread fallback
            for i, chunk in enumerate(
                tqdm(self.chunks, desc="Chunk", leave=False), start=1
            ):
                try:
                    tmp_name = f"{self.output_file.split('.')[0]}-tmp-{i}.wav"
                    self.ttsfy(chunk, tmp_name)
                    tmp_files.append(tmp_name)
                except Exception as e:
                    log.exception(f"\033[31mError in chunk {i}\033[0m: {e}")

        # Merge or rename results
        if tmp_files:
            if len(tmp_files) == 1:
                Path(tmp_files[0]).rename(self.output_file)
            else:
                combine_temp_files(
                    temp_files=tmp_files, output_filename=self.output_file
                )

        # Clean up
        clean_up_temp_files(tmp_files)
        return self.output_file if self.output_file else {"Error": ""}

    def SingleThreadProcessor(self):
        """Process single text input"""
        tmp_files = []

        pbar = tqdm(self.chunks, desc="Chunk", leave=False)

        for i, chunk in enumerate(pbar, start=1):
            try:
                tmp_name = f"{self.output_file.split('.')[0]}-tmp-{i}.wav"
                self.ttsfy(chunk, tmp_name)
                tmp_files.append(tmp_name)
            except Exception as e:
                log.error(f"\033[31mError in chunk {i}\033[0m: {e}")

        if tmp_files:
            if len(tmp_files) < 1:
                Path(tmp_files[0]).rename(self.output_file)
            else:
                combine_temp_files(
                    temp_files=tmp_files, output_filename=self.output_file
                )
            clean_up_temp_files(tmp_files)

        return self.output_file if self.output_file else {"Error": ""}

    def ttsfy(self, text, filename) -> Path:  # io.BytesIO:
        # Convert text to mel-spectrogram
        mel_output, _, _, _ = self.fastspeech2.encode_text(
            [text],
            pace=self.speed,
            pitch_rate=self.pitch,
            energy_rate=self.energy,
        )

        # Convert mel to waveform
        waveform = self.hifi_gan.decode_batch(mel_output)

        # Save to memory (instead of disk)
        # buffer = io.BytesIO()
        torchaudio.save(filename, waveform.squeeze(1).cpu(), 22050, format="wav")
        # buffer.seek(0)

        # Return as file
        return filename
