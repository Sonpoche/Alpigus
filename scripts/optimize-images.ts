const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

async function optimizeImages() {
  const presetsDir = path.join(process.cwd(), 'public', 'presets', 'mushrooms');
  
  try {
    // Vérifier que le dossier existe
    await fs.access(presetsDir);
    
    // Lire tous les fichiers du dossier
    const files = await fs.readdir(presetsDir);
    
    // Traiter chaque image
    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png)$/i)) {
        const filePath = path.join(presetsDir, file);
        const outputPath = path.join(presetsDir, 'optimized', file.replace(/\.[^.]+$/, '.jpg'));
        
        // Créer le dossier optimized s'il n'existe pas
        await fs.mkdir(path.join(presetsDir, 'optimized'), { recursive: true });
        
        console.log(`Optimisation de ${file}...`);
        
        await sharp(filePath)
          .resize(800, 800, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ 
            quality: 85,
            mozjpeg: true
          })
          .toFile(outputPath);
          
        console.log(`✓ ${file} optimisé`);
      }
    }
    
    console.log('Optimisation terminée !');
  } catch (error) {
    console.error('Erreur lors de l\'optimisation :', error);
    process.exit(1);
  }
}

optimizeImages().catch(console.error);