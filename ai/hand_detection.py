def extract_landmarks(hand_landmarks):
    """
    Extract Y-coordinates of 21 hand landmarks.
    Y-values are used for simple gesture comparison.

    Returns:
        landmarks (list): List of 21 float values
    """

    landmarks = []

    for lm in hand_landmarks.landmark:
        landmarks.append(lm.y)

    return landmarks



