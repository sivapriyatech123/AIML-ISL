


def count_open_fingers(landmarks):
    

    open_fingers = 0

    # Index finger
    if landmarks[8] < landmarks[6]:
        open_fingers += 1

    # Middle finger
    if landmarks[12] < landmarks[10]:
        open_fingers += 1

    # Ring finger
    if landmarks[16] < landmarks[14]:
        open_fingers += 1

    # Pinky finger
    if landmarks[20] < landmarks[18]:
        open_fingers += 1

    # Thumb (simple check)
    if landmarks[4] < landmarks[2]:
        open_fingers += 1

    return open_fingers



def predict_gesture(landmarks):
    """
    One-hand gesture recognition
    """

    open_fingers = count_open_fingers(landmarks)

    if open_fingers == 5:
        return "HELLO"

    elif open_fingers == 0:
        return "STOP"

    elif open_fingers == 1:
        return "YES"

    elif open_fingers == 2:
        return "NO"

    elif open_fingers == 3:
        return "GOOD"

    elif open_fingers == 4:
        return "THANK YOU"

    else:
        return "UNKNOWN"




def predict_two_hand_gesture(l1, l2):
    """
    Two-hand gesture recognition using combinations
    """

    open1 = count_open_fingers(l1)
    open2 = count_open_fingers(l2)

    # Both hands open
    if open1 == 5 and open2 == 5:
        return "EMERGENCY"

    # Both fists
    elif open1 == 0 and open2 == 0:
        return "DANGER"

    # One open, one fist
    elif (open1 == 5 and open2 == 0) or (open1 == 0 and open2 == 5):
        return "HELP"

    # Two fingers on both hands
    elif open1 == 2 and open2 == 2:
        return "HOSPITAL"

    # Index finger on both hands
    elif open1 == 1 and open2 == 1:
        return "WE"

    # Three fingers + three fingers
    elif open1 == 3 and open2 == 3:
        return "NEED"

    # Four fingers + four fingers
    elif open1 == 4 and open2 == 4:
        return "DOCTOR"

    else:
        return "UNKNOWN"
