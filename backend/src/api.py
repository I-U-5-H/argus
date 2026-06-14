import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from src.emulation import WebcamEmulator
from src.brain import DrowsinessBrain

emulator = WebcamEmulator()
brain = DrowsinessBrain()

connected_clients: set[WebSocket] = set()

# Updated default state to match the React Frontend schema exactly
current_state = {
    "status": "NOMINAL",
    "event_spikes": 0,
    "membrane_potential": 0.0,
    "threshold": 3.0,
    "compute_power": "NOMINAL"
}

async def process_loop():
    global current_state
    while True:
        try:
            # Run the blocking OpenCV read in a separate thread
            _, spike_count = await asyncio.to_thread(emulator.get_spikes)

            # Process spikes through SNN
            raw_state = brain.process_spikes(spike_count)
            
           # --- THE FIX: DATA MAPPING BRIDGE ---
            is_sleep = raw_state.get("is_micro_sleep", False)
            membrane = raw_state.get("neuron_membrane_potential", 0.0)
            brain_threshold = raw_state.get("threshold", 120.0) # Read the new dynamic threshold
            
            telemetry_payload = {
                "status": "CRITICAL" if is_sleep else "NOMINAL",
                "event_spikes": spike_count,
                "membrane_potential": membrane,
                "threshold": brain_threshold,  # Replaced hardcoded 3.0 with brain_threshold
                "compute_power": "MINIMAL" if spike_count < 15 else "NOMINAL"
            }
            
            current_state = telemetry_payload

            # Broadcast state to all connected clients
            if connected_clients:
                message = json.dumps(telemetry_payload)
                # Snapshot set to avoid RuntimeError if a client disconnects mid-iteration
                clients_snapshot = list(connected_clients)
                await asyncio.gather(
                    *[client.send_text(message) for client in clients_snapshot],
                    return_exceptions=True
                )

            # ~30fps loop delay
            await asyncio.sleep(0.033)
        except Exception as e:
            print(f"Error in process loop: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch the background processing loop
    task = asyncio.create_task(process_loop())
    yield
    # Shutdown: cancel the loop and release camera
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    emulator.release()


app = FastAPI(title="Neuromorphic Anti-Drowsiness API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            # Keep the connection alive; client can send pings or any text
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.discard(websocket)
    except Exception:
        connected_clients.discard(websocket)