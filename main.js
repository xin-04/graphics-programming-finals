/**
 * APP WALKTHROUGH
 * Both tasks run from one sketch, switched with keys 1 (Task 1) and 2 (Task 2).
 * 
 * Task 1 - Streaming Carousel: 
 * C loads the scrolling background, 
 * L processes all 8 images (applying per-image RGB/HSB background-removal thresholds from 
 *    the stored thresholds array),
 * S starts the animation. Each image fades in, zooms in or out depending on index
 *    parity, and fades out while panning left to right; a background image scrolls independently, and
 *    overlay text animates right to left in sync. P pauses.
 * 
 * Task 2 - Panorama Motion Guide: 
 * P loads the panorama screen, I loads the image pairs. G converts frames to grayscale, 
 * E applies an edge filter, 
 * T thresholds the edge output (adjustable via a live slider),
 * N computes each frame's centroid and the resulting direction. 
 * D displays this as an arrow overlay. 
 * Left/Right arrows navigate between 8 pairs (the provided pairs plus
 *    additional pairs I created in GIMP) to cover the remaining required directions. 
 * B triggers my extension: block-based motion estimation, dividing each frame into blocks and estimating each
 *    block's displacement independently via SAD-based search, then combining them into an
 *    overall direction and visualising per-block vectors. This reveals whether motion is uniform or
 *    varies spatially, which a single centroid cannot show.
 * 
 * ===============================================================================================
 * 
 * PROBLEMS FACED
 * For Task 1, I tested RGB and HSB thresholding across all 8 images; RGB won in every case.
 * Most images have low-saturation content (white/neutral backgrounds, dark or white clothing),
 * where HSB's hue channel is unstable near zero saturation. Even for image 6's saturated blue shirt,
 * HSB left more residual background, likely from hue noise in subtle background brightness variation.
 * Image 8 showed the opposite failure: HSB removed foreground skin because skin tone and the subject's
 * tan blazer are hue-similar. For image 2's frizzy hair, I found feathering couldn't help without also
 * eroding the white shirt, since colour-distance thresholding cannot distinguish two regions of 
 * near-identical colour regardless of feathering. I chose to preserve the shirt.
 * 
 * For Task 2's extension, I attempted coarse-to-fine search to reduce the approx. 103,000 candidates 
 * per block down to approx. 6,500, refining around the best coarse results. This significantly hurt 
 * accuracy. I initially suspected the single-best coarse candidate was locking onto the wrong local minimum, 
 * so I refined around multiple top candidates instead — this didn't help either. I concluded the real issue 
 * is undersampling, not misranking: my block content is sparse thresholded edge outlines, not smooth 
 * photographic detail, so the true best offset can sit in a narrow window the coarse grid never samples at 
 * all. I reverted to exhaustive search (keeping the early-exit SAD optimisation, which costs no accuracy),
 * and instead fixed the actual performance problem (slider lag) with debouncing, recalculating only 200ms 
 * after the slider stops moving.
 * 
 * ===============================================================================================
 * 
 * WAS I ON TARGET?
 * Yes. The main obstacle was the coarse-to-fine optimisation described above; understanding why it failed,
 * rather than just discarding it, was itself a useful part of the process.
 * 
 * ===============================================================================================
 * 
 * EXTENSION UNQIUENESS
 * Block-based SAD motion estimation goes beyond a single global centroid by revealing spatial variation in 
 * motion across the frame, useful for detecting cases like partial scale change that a single average 
 * position would hide.
 * 
 * 
 */

let task1;
let task2;
let currentMenu;

let bgImg;
const task1Images = [];
const task2Images = [];
const thresholds = [
  // [colourSpace, c1, c2, c3, thresholdVal]
  [0, 227, 217, 226, 59],
  [0, 255, 255, 255, 24],
  [0, 174, 207, 236, 78],
  [0, 255, 253, 250, 56],
  [0, 255, 255, 255, 56],
  [0, 250, 251, 253, 28],
  [0, 255, 255, 255, 9],
  [0, 244, 235, 230, 27]
];

const TASK1_MENU = 0;
const TASK2_MENU = 1;

function preload() {
  bgImg = loadImage('assets/task1/background.png');
  for (let i = 1; i < 9; i++) {
    let img = loadImage(`assets/task1/${i}.jpg`);
    task1Images.push(img);
  }

  for (let i = 1; i < 9; i++) {
    for (let j = 1; j < 3; j++) {
      let img = loadImage(`assets/task2/pair${i}_${j}.png`);
      task2Images.push(img);
    }
  }
}

function setup() {
  createCanvas(1200, 720);
  textSize(24);

  task1 = new Task1();
  task2 = new Task2();
  currentMenu = 0;
}

function draw() {
  if (currentMenu === TASK1_MENU) {
    task1.draw();
  }

  if (currentMenu === TASK2_MENU) {
    task2.draw();
  }
}

function switchMenu(menu) {
  if (menu === currentMenu) {
    return;
  }

  task1.resetAnimation();
  task2.resetAnimation();
  currentMenu = menu;
  clear();
}

function keyPressed() {
  // Key '1': switch to task1
  if (keyCode === 49) {
    switchMenu(TASK1_MENU);
  }

  // Key '2': switch to task2
  if (keyCode === 50) {
    switchMenu(TASK2_MENU);
  }

  // ================= TASK 1 ==================
  // Key 'c': load carousel
  if (keyCode === 67 && currentMenu === 0) {
    task1.bgLoaded = true;
  }

  // Key 'l': load images
  if (keyCode === 76 && currentMenu === 0) {
    task1.loadImages();
  }

  // Key 's': start animation
  if (keyCode === 83 && currentMenu === 0 && task1.imageLoaded) {
    task1.startAnimation();
  }

  // Key 'p': pause animation
  if (keyCode === 80 && currentMenu === 0 && task1.animationStarted) {
    task1.pauseAnimation();
  }

  // ================= TASK 2 ==================
  // Key 'p': load panorama
  if (keyCode === 80 && currentMenu === 1) {
    task2.loadPanorama();
  }

  // Key 'i': load image pairs
  if (keyCode === 73 && currentMenu === 1) {
    task2.loadImages();
  }

  // Left arrow: show previous image pair
  if (keyCode === LEFT_ARROW && currentMenu === 1) {
    task2.previousPair();
  }

  // Right arrow: show next image pair
  if (keyCode === RIGHT_ARROW && currentMenu === 1) {
    task2.nextPair();
  }

  // Key 'g': apply greyscale
  if (keyCode === 71 && currentMenu === 1 && task2.imageLoaded) {
    task2.grayscaleApplied = true;
  }

  // Key 'e': apply edge detection
  if (keyCode === 69 && currentMenu === 1 && task2.grayscaleApplied) {
    task2.edgeApplied = true;
  }

  // Key 't': apply thresholding
  if (keyCode === 84 && currentMenu === 1 && task2.edgeApplied) {
    task2.thresholdApplied = true;
  }

  // Key 'n': compute centroid
  if (keyCode === 78 && currentMenu === 1 && task2.thresholdApplied) {
    task2.centroidApplied = true;
  }

  // Key 'b': apply block-based motion estimation
  if (keyCode === 66 && currentMenu === 1 && task2.thresholdApplied) {
    task2.runBlockMotionEstimation();
  }

  // Key 'd': display detected direction
  if (keyCode === 68 && currentMenu === 1 && task2.centroidApplied) {
    task2.directionShowed = true;
  }
}
