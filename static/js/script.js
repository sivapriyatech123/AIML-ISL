
function openWebcam() {
    window.location.href = "/start_webcam";
}

function stopWebcam() {
    window.location.href = "/stop_webcam";
}

function playAudio() {
    fetch("/speak_text")
        .then(res => res.text())
        .then(data => console.log(data));
}

function fetchText() {
    fetch("/get_text")
        .then(res => res.text())
        .then(text => {
            document.getElementById("outputText").innerText = text || "---";
        });
}

setInterval(fetchText, 1000);
