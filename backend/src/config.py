# src/config.py

# --- Vision Emulation Layer ---
DIFF_THRESHOLD = 25          # Pixel difference intensity to count as an event
BLINK_SPIKE_LIMIT = 15       # Minimum spikes needed to register as a "blink" or "movement"

# --- Neuromorphic Brain Layer ---
MICRO_SLEEP_SEC = 4.0        # Increased from 2.0s to 4.0s to stop annoying false positives
FPS_ASSUMPTION = 30.0        # Standard webcam frame rate
MEMBRANE_THRESHOLD = MICRO_SLEEP_SEC * FPS_ASSUMPTION  # The max charge before the alarm fires