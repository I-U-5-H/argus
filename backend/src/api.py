import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from src.emulation import WebcamEmulator
from src.brain import DrowsinessBrain
from src.analytics import log_event

emulator = WebcamEmulator()
brain = DrowsinessBrain()

connected_clients: set[WebSocket] = set()

current_state = {
    "status": "NOMINAL",
    "event_spikes": 0,
    "membrane_potential": 0.0,
    "threshold": 3.0,
    "compute_power": "NOMINAL"
}
last_logged_status = "NOMINAL"

async def process_loop():
    global current_state, last_logged_status
    while True:
        try:

            _, spike_count = await asyncio.to_thread(emulator.get_spikes)


            raw_state = brain.process_spikes(spike_count)
            
            is_sleep = raw_state.get("is_micro_sleep", False)
            membrane = raw_state.get("neuron_membrane_potential", 0.0)
            brain_threshold = raw_state.get("threshold", 120.0)
            
            current_status = "CRITICAL" if is_sleep else "NOMINAL"
            
            if current_status != last_logged_status:
                log_event(
                    event_type=f"STATE_CHANGED_TO_{current_status}",
                    spike_count=spike_count,
                    membrane_potential=membrane
                )
                last_logged_status = current_status 

            telemetry_payload = {
                "status": current_status,
                "event_spikes": spike_count,
                "membrane_potential": membrane,
                "threshold": brain_threshold,
                "compute_power": "MINIMAL" if spike_count < 15 else "NOMINAL"
            }
            
            current_state = telemetry_payload

            if connected_clients:
                message = json.dumps(telemetry_payload)
                clients_snapshot = list(connected_clients)
                await asyncio.gather(
                    *[client.send_text(message) for client in clients_snapshot],
                    return_exceptions=True
                )

            await asyncio.sleep(0.033)
        except Exception as e:
            print(f"Error in process loop: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):

    log_event("SESSION_STARTED", spike_count=0, membrane_potential=0.0)
    task = asyncio.create_task(process_loop())
    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    emulator.release()
    log_event("SESSION_ENDED", spike_count=0, membrane_potential=0.0)


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
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.discard(websocket)
    except Exception:
        connected_clients.discard(websocket)

from src.analytics import calculate_driver_score

@app.get("/contractor/score")
async def get_contractor_score():
    score = calculate_driver_score()
    status = "EXCELLENT" if score > 80 else "WARNING: NEEDS REST"
    return {
        "fleet_id": "FLEET-MAC-01",
        "driver_name": "Satish Kumar",
        "current_safety_score": f"{score}%",
        "recommendation": status
    }
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup log
    log_event("SESSION_STARTED", spike_count=0, membrane_potential=0.0)