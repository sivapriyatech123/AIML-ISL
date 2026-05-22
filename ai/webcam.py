import cv2
import mediapipe as mp
import time
import threading

from ai.hand_detection import extract_landmarks
from ai.gesture_model import predict_gesture, predict_two_hand_gesture

# ---------------- MediaPipe Setup ----------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,              # ✅ TWO HANDS ENABLED
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

mp_draw = mp.solutions.drawing_utils

# ---------------- Shared State ----------------
detected_text = ""
webcam_running = False
output_frame = None
lock = threading.Lock()

# ---------------- START WEBCAM LOOP ----------------
def start_webcam():
    global detected_text, webcam_running, output_frame

    print("📷 Webcam started (Background)")

    # 🔑 RESET STATE EVERY START
    detected_text = ""
    sentence = ""

    webcam_running = True
    cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)

    last_added_time = 0
    add_delay = 2.0   # seconds (controls word speed)

    while webcam_running:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        gesture = "UNKNOWN"
        current_time = time.time()

        if result.multi_hand_landmarks:

            hand_count = len(result.multi_hand_landmarks)

            # 🟢 ONE HAND
            if hand_count == 1:
                hand1 = result.multi_hand_landmarks[0]
                mp_draw.draw_landmarks(frame, hand1, mp_hands.HAND_CONNECTIONS)

                l1 = extract_landmarks(hand1)
                gesture = predict_gesture(l1)

            # 🟢 TWO HANDS
            elif hand_count == 2:
                hand1 = result.multi_hand_landmarks[0]
                hand2 = result.multi_hand_landmarks[1]

                mp_draw.draw_landmarks(frame, hand1, mp_hands.HAND_CONNECTIONS)
                mp_draw.draw_landmarks(frame, hand2, mp_hands.HAND_CONNECTIONS)

                l1 = extract_landmarks(hand1)
                l2 = extract_landmarks(hand2)

                gesture = predict_two_hand_gesture(l1, l2)

            # 🧠 Add gesture to sentence (with delay)
            if gesture != "UNKNOWN":
                if current_time - last_added_time > add_delay:
                    sentence += gesture + " "
                    detected_text = sentence
                    last_added_time = current_time

        # ---------------- UI TEXT ON FRAME ----------------
        cv2.putText(
            frame,
            f"Gesture: {gesture}",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Text: {sentence}",
            (30, 90),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 0),
            2
        )

        # Update global frame for streaming
        with lock:
            output_frame = frame.copy()
        
        # Small sleep to prevent 100% CPU usage if loop is too tight, 
        # though cap.read() usually blocks enough.
        time.sleep(0.01)

    cap.release()
    webcam_running = False
    print("🛑 Webcam stopped")

# ---------------- STOP WEBCAM ----------------
def stop_webcam():
    global webcam_running
    webcam_running = False
    print("🛑 stop_webcam() called")

# ---------------- GENERATOR FOR FLASK ----------------
def generate_frames():
    global output_frame, lock
    
    while True:
        with lock:
            if output_frame is None:
                continue
            
            # Encode frame as JPEG
            (flag, encodedImage) = cv2.imencode(".jpg", output_frame)
            if not flag:
                continue
        
        # Yield the output frame in byte format
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
               bytearray(encodedImage) + b'\r\n')
        
        # Control framerate of stream slightly
        time.sleep(0.03)
