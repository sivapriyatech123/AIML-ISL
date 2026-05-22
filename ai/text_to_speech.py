import pyttsx3

def speak(text):
    """
    Convert text to speech (fresh engine every time)
    Fixes second-time audio not working issue
    """
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()
    engine.stop()
