import cv2
import numpy as np
from src.config import DIFF_THRESHOLD

class WebcamEmulator:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)
        self.prev_frame = None

    def get_spikes(self):
        ret, frame = self.cap.read()
        if not ret:
            return None, 0

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Resize to downsample for the SNN to keep dimensionality small
        gray = cv2.resize(gray, (64, 64))

        if self.prev_frame is None:
            self.prev_frame = gray
            return frame, 0

        # Frame differencing
        diff = cv2.absdiff(self.prev_frame, gray)
        # Threshold to get discrete spikes
        _, spike_frame = cv2.threshold(diff, DIFF_THRESHOLD, 1, cv2.THRESH_BINARY)
        
        self.prev_frame = gray
        
        # Calculate total spikes in the current frame
        spike_count = int(np.sum(spike_frame))
        return frame, spike_count

    def release(self):
        self.cap.release()
