// Setup the canvas
const canvas = document.getElementById("artCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Define a color palette
const palette = [

    //Sylveon Color Palette
    "#F59BAD", //Dark Pink
    "#FAD0D5", // Light Pink
    "#F8EADC", // Creamy Yellowish
    "#778BBE", // Dark Blue
    "#9EDEF9", // Light Blue

//Arcane Void
    // "#F1B2D8", //Light Pink
    // "#D2D8AF", // Yellowish Green
    // "#F8EADC", // Creamy Yellowish
    //  "#493C52", // Dark Purple
    // "#9EDEF9", // Light Blue
    //  "#93EFDE", // Light Teal
    //  "#B79FB7", // Light Purple

];

// Function that pick a random color from the palette
function getRandomColor() {
    return palette[Math.floor(Math.random() * palette.length)];
}

// Generates noise-based art
function generateArt() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create random background color from the palette
    ctx.fillStyle = getRandomColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw shapes with random properties
    for (let i = 0; i < 100; i++) {
        ctx.beginPath();
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 100;

        // Random color from the palette
        const randomColor = getRandomColor();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = randomColor;
        ctx.fill();
    }
}

// Call the function to generate art
generateArt();

// Redraw every second (for dynamic change)
setInterval(generateArt, 1000);