import csv
import os
from datetime import datetime

LOG_FILE = "driver_logs.csv"

def log_event(event_type, spike_count=0, membrane_potential=0.0):
    file_exists = os.path.exists(LOG_FILE)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(LOG_FILE, mode='a', newline='') as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["Timestamp", "Event_Type", "Spike_Count", "Membrane_Potential"])
        writer.writerow([timestamp, event_type, spike_count, round(membrane_potential, 4)])

def calculate_driver_score():
    if not os.path.exists(LOG_FILE):
        return 100

    critical_count = 0
    try:
        with open(LOG_FILE, mode='r') as file:
            reader = csv.reader(file)
            next(reader) # Skip header
            
            for row in reader:
                if len(row) >= 2 and row[1].strip() == "STATE_CHANGED_TO_CRITICAL":
                    critical_count += 1
    except Exception as e:
        print(f"Error reading logs: {e}")
        return 100

    base_score = 100 - (critical_count * 15)
    return max(0, base_score)