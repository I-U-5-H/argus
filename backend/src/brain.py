import torch
import snntorch as snn
from snntorch import surrogate
from src import config

class DrowsinessBrain:
    def __init__(self):

        self.beta = 0.99  
        spike_grad = surrogate.fast_sigmoid()
        
        self.lif = snn.Leaky(beta=self.beta, spike_grad=spike_grad, reset_mechanism="zero")        
        self.mem = self.lif.init_leaky()
        self.is_micro_sleep = False

        try:
            frames_to_sleep = config.MICRO_SLEEP_SEC * config.FPS_ASSUMPTION
            self.blink_limit = config.BLINK_SPIKE_LIMIT
        except AttributeError:
            frames_to_sleep = 4.0 * 30.0  
            self.blink_limit = 15         
            
        self.drowsy_current = (1.0 * (1 - self.beta)) / (1 - (self.beta ** frames_to_sleep))

    def process_spikes(self, spike_count):

        if spike_count > self.blink_limit:
            self.mem = torch.zeros_like(self.mem)
            self.is_micro_sleep = False
            input_stimulus = torch.tensor([0.0])
            
        else:
            input_stimulus = torch.tensor([self.drowsy_current])

        spk, self.mem = self.lif(input_stimulus, self.mem)

        if spk.item() > 0:
            self.is_micro_sleep = True
            self.mem = torch.tensor([1.0])

        return {
            "spikes": spike_count,
            "is_micro_sleep": self.is_micro_sleep,
            "neuron_membrane_potential": float(self.mem.item()),
            "threshold": 1.0  
        }