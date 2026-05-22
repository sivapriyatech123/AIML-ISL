let angle = 0;

function setup() {
    let canvas = createCanvas(200, 200);
    canvas.position(30, 30); // position near login card
    canvas.style("z-index", "-1");
}

function draw() {
    clear();
    translate(width / 2, height / 2);

    // Palm
    fill(255, 220, 180);
    noStroke();
    rect(-30, -10, 60, 60, 15);

    // Fingers (animated)
    drawFinger(-20, -20, 0);
    drawFinger(-5, -30, angle);
    drawFinger(10, -30, angle);
    drawFinger(25, -20, 0);

    angle = sin(frameCount * 0.08) * 15;
}

function drawFinger(x, y, rotateAngle) {
    push();
    translate(x, y);
    rotate(radians(rotateAngle));
    rect(0, 0, 10, 40, 5);
    pop();
}
