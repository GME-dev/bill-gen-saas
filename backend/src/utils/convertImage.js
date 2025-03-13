import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = path.join(__dirname, '../assets/logo.jpg');
const outputPath = path.join(__dirname, '../assets/logo.png');

sharp(inputPath)
    .png()
    .toFile(outputPath)
    .then(info => {
        console.log('Image converted successfully:', info);
    })
    .catch(err => {
        console.error('Error converting image:', err);
    }); 