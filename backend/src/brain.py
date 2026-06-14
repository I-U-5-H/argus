import torch
import snntorch as snn
from snntorch import surrogate
from src import config

class DrowsinessBrain:
    def __init__(self):
        # 1. BIOLOGICAL PARAMETERS
        self.beta = 0.99  # Slight biological leak (creates a smooth charge curve)
        spike_grad = surrogate.fast_sigmoid()
        
        # snnTorch LIF Neuron (Default firing threshold is always 1.0)
        self.lif = snn.Leaky(beta=self.beta, spike_grad=spike_grad, reset_mechanism="zero")
        
        # State tracking
        self.mem = self.lif.init_leaky()
        self.is_micro_sleep = False
        
        # 2. DROWSINESS ACCUMULATOR MATH
        # We pull from config, or use safe fallbacks if config is missing them
        try:
            frames_to_sleep = config.MICRO_SLEEP_SEC * config.FPS_ASSUMPTION
            self.blink_limit = config.BLINK_SPIKE_LIMIT
        except AttributeError:
            frames_to_sleep = 4.0 * 30.0  # 4 seconds at 30 FPS
            self.blink_limit = 15         # Min white pixels to count as a blink
            
        # We calculate the exact mathematical current needed to overcome the 0.99 leak
        # and forcefully hit the 1.0 threshold at exactly the target timeframe.
        self.drowsy_current = (1.0 * (1 - self.beta)) / (1 - (self.beta ** frames_to_sleep))

    def process_spikes(self, spike_count):
        # --- BIOLOGICAL INHIBITION (The Reset) ---
        # If the camera sees a blink or movement, we INHIBIT the neuron.
        # This instantly dumps the membrane charge back to 0.
        if spike_count > self.blink_limit:
            self.mem = torch.zeros_like(self.mem)
            self.is_micro_sleep = False
            input_stimulus = torch.tensor([0.0])
            
        # --- EXCITATORY DRIVE (The Sleep Timer) ---
        # If there is spatial silence, we feed a steady current to build up sleep charge.
        else:
            input_stimulus = torch.tensor([self.drowsy_current])

        # Forward pass through the LIF neuron (One timestep = One webcam frame)
        spk, self.mem = self.lif(input_stimulus, self.mem)

        # If the SNN produces a spike, the sleep threshold (1.0) has been breached!
        if spk.item() > 0:
            self.is_micro_sleep = True
            self.mem = torch.tensor([1.0])  # Cap at 1.0 so the UI progress bar stays neat

        return {
            "spikes": spike_count,
            "is_micro_sleep": self.is_micro_sleep,
            "neuron_membrane_potential": float(self.mem.item()),
            "threshold": 1.0  # snnTorch default threshold
        }