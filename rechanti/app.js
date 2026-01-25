const { useState, useRef } = React;

// Icônes SVG inline au lieu de Lucide
const Upload = ({ className }) => React.createElement('svg', { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' })
);

const Download = ({ className }) => React.createElement('svg', { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10' })
);

const Settings = ({ className }) => React.createElement('svg', { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
);

const Check = ({ className }) => React.createElement('svg', { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M5 13l4 4L19 7' })
);

const FolderOpen = ({ className }) => React.createElement('svg', { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z' })
);

const AlertCircle = ({ className }) => React.createElement('svg', { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
  React.createElement('circle', { cx: 12, cy: 12, r: 10, strokeWidth: 2 }),
  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 8v4m0 4h.01' })
);

function RechantiApp() {
  const [images, setImages] = useState([]);
  const [inputFolder, setInputFolder] = useState('');
  const [outputFolderHandle, setOutputFolderHandle] = useState(null);
  const [outputFolder, setOutputFolder] = useState('');
  const [sizePercent, setSizePercent] = useState(80);
  const [qualityPercent, setQualityPercent] = useState(85);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [useFileSystemAPI, setUseFileSystemAPI] = useState(false);
  const inputFolderRef = useRef(null);

  const supportsFileSystemAPI = 'showDirectoryPicker' in window;

  const handleInputFolderSelect = async (e) => {
    console.log('Files selected:', e.target.files.length);
    
    const allFiles = Array.from(e.target.files);
    
    const jpgFiles = allFiles.filter(file => {
      const isJpg = file.type === 'image/jpeg' || 
                    file.type === 'image/jpg' ||
                    file.name.toLowerCase().endsWith('.jpg') ||
                    file.name.toLowerCase().endsWith('.jpeg');
      return isJpg;
    });
    
    console.log('JPG files found:', jpgFiles.length);
    
    if (jpgFiles.length === 0) {
      alert('Aucune image JPG trouvée dans ce dossier');
      return;
    }

    const firstFile = jpgFiles[0];
    let folderName = 'Images';
    if (firstFile.webkitRelativePath) {
      const pathParts = firstFile.webkitRelativePath.split('/');
      folderName = pathParts[0];
    }
    setInputFolder(folderName);
    
    const imageData = [];
    for (const file of jpgFiles) {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      
      imageData.push({
        name: file.name,
        file: file,
        path: file.webkitRelativePath || file.name,
        preview: dataUrl,
        processed: false
      });
    }
    
    console.log('Setting images state with:', imageData.length, 'images');
    setImages(imageData);
    setProcessed(0);
  };

  const handleSelectOutputFolder = async () => {
    console.log('Button clicked!');
    console.log('supportsFileSystemAPI:', supportsFileSystemAPI);
    
    if (!supportsFileSystemAPI) {
      alert('Votre navigateur ne supporte pas la sélection de dossier avancée. Utilisez Chrome ou Edge. Les fichiers seront téléchargés dans votre dossier Téléchargements.');
      setOutputFolder('Téléchargements');
      setUseFileSystemAPI(false);
      return;
    }

    try {
      console.log('Calling showDirectoryPicker...');
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      console.log('Directory selected:', dirHandle);
      setOutputFolderHandle(dirHandle);
      setOutputFolder(dirHandle.name);
      setUseFileSystemAPI(true);
      console.log('Output folder selected:', dirHandle.name);
    } catch (error) {
      console.error('Error:', error);
      if (error.name === 'AbortError') {
        console.log('User cancelled folder selection');
      } else if (error.name === 'NotAllowedError') {
        alert('Permission refusée. Veuillez autoriser l\'accès au dossier.');
      } else {
        console.error('Error selecting folder:', error);
        alert('Erreur lors de la sélection du dossier: ' + error.message);
      }
    }
  };

  const processImage = (file, size, quality) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      
      reader.onload = (e) => {
        img.src = e.target.result;
        
        img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const newWidth = Math.round(img.width * (size / 100));
            const newHeight = Math.round(img.height * (size / 100));
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Erreur de création du blob'));
                }
              },
              'image/jpeg',
              quality / 100
            );
          } catch (error) {
            reject(error);
          }
        };
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleProcessAndDownload = async () => {
    if (images.length === 0) {
      alert('Veuillez d\'abord sélectionner un dossier d\'images');
      return;
    }
    
    console.log('Starting processing...');
    setProcessing(true);
    setProcessed(0);
    
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        console.log(`Processing image ${i + 1}/${images.length}:`, img.name);
        
        setProcessed(i);
        
        try {
          const processedBlob = await processImage(img.file, sizePercent, qualityPercent);
          console.log(`Image ${i + 1} processed successfully`);
          
          if (useFileSystemAPI && outputFolderHandle) {
            const fileName = `rechanti_${img.name}`;
            const fileHandle = await outputFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(processedBlob);
            await writable.close();
            console.log(`Saved to folder: ${fileName}`);
          } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(processedBlob);
            link.download = `rechanti_${img.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
          }
          
          setProcessed(i + 1);
          console.log(`Progress: ${i + 1}/${images.length}`);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Erreur lors du traitement de ${img.name}:`, error);
          alert(`Erreur sur ${img.name}: ${error.message}`);
        }
      }
      
      console.log('Processing complete!');
      const destination = useFileSystemAPI && outputFolder ? `le dossier "${outputFolder}"` : 'votre dossier de téléchargements';
      alert(`Traitement terminé ! ${images.length} image(s) sauvegardée(s) dans ${destination}.`);
    } catch (error) {
      console.error('Erreur globale:', error);
      alert('Une erreur est survenue lors du traitement: ' + error.message);
    } finally {
      setProcessing(false);
      console.log('Processing finished');
    }
  };

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100' },
    React.createElement('div', { className: 'container mx-auto px-4 py-8 max-w-5xl' },
      React.createElement('div', { className: 'text-center mb-8' },
        React.createElement('div', { className: 'flex items-center justify-center mb-4' },
          React.createElement('svg', { className: 'w-12 h-12 text-indigo-600 mr-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }),
            React.createElement('circle', { cx: '8.5', cy: '8.5', r: '1.5' }),
            React.createElement('polyline', { points: '21 15 16 10 5 21', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' })
          ),
          React.createElement('h1', { className: 'text-4xl font-bold text-gray-800' }, 'Rechanti')
        ),
        React.createElement('p', { className: 'text-gray-600' }, 'Redimensionnement et rééchantillonnage d\'images JPG')
      ),

      !supportsFileSystemAPI && React.createElement('div', { className: 'bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded' },
        React.createElement('div', { className: 'flex items-start' },
          React.createElement(AlertCircle, { className: 'w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0' }),
          React.createElement('div', { className: 'text-sm text-yellow-700' },
            React.createElement('p', { className: 'font-semibold mb-1' }, 'Navigateur non compatible :'),
            React.createElement('p', null, 'Votre navigateur ne supporte pas la sauvegarde directe dans un dossier. Utilisez Chrome ou Edge pour cette fonctionnalité.')
          )
        )
      ),

      React.createElement('div', { className: 'grid md:grid-cols-2 gap-6 mb-6' },
        React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-6' },
          React.createElement('div', { className: 'flex items-center mb-4' },
            React.createElement(FolderOpen, { className: 'w-5 h-5 text-indigo-600 mr-2' }),
            React.createElement('h2', { className: 'text-lg font-semibold text-gray-800' }, 'Dossier source')
          ),
          React.createElement('input', {
            ref: inputFolderRef,
            type: 'file',
            webkitdirectory: 'true',
            multiple: true,
            accept: 'image/jpeg,image/jpg,.jpg,.jpeg',
            onChange: handleInputFolderSelect,
            className: 'hidden'
          }),
          React.createElement('button', {
            onClick: () => inputFolderRef.current?.click(),
            className: 'w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors'
          },
            React.createElement(Upload, { className: 'w-5 h-5' }),
            React.createElement('span', null, 'Sélectionner dossier')
          ),
          inputFolder && React.createElement('div', { className: 'mt-3 p-3 bg-green-50 border border-green-200 rounded-lg' },
            React.createElement('p', { className: 'text-sm text-green-800 font-medium' }, '📁 ' + inputFolder),
            React.createElement('p', { className: 'text-xs text-green-600 mt-1' }, images.length + ' image' + (images.length > 1 ? 's' : ''))
          )
        ),

        React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-6' },
          React.createElement('div', { className: 'flex items-center mb-4' },
            React.createElement(FolderOpen, { className: 'w-5 h-5 text-green-600 mr-2' }),
            React.createElement('h2', { className: 'text-lg font-semibold text-gray-800' }, 'Dossier destination')
          ),
          React.createElement('button', {
            onClick: handleSelectOutputFolder,
            className: 'w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-3'
          },
            React.createElement(Download, { className: 'w-5 h-5' }),
            React.createElement('span', null, 'Choisir un dossier spécifique')
          ),
          React.createElement('button', {
            onClick: () => {
              setOutputFolder('Téléchargements');
              setOutputFolderHandle(null);
              setUseFileSystemAPI(false);
            },
            className: 'w-full text-sm text-gray-600 hover:text-gray-800 underline'
          }, 'Utiliser le dossier Téléchargements'),
          outputFolder && React.createElement('div', { className: 'mt-3 p-3 bg-green-50 border border-green-200 rounded-lg' },
            React.createElement('p', { className: 'text-sm text-green-800 font-medium' }, '📁 ' + outputFolder),
            React.createElement('p', { className: 'text-xs text-green-600 mt-1' }, useFileSystemAPI ? 'Sauvegarde directe' : 'Téléchargement automatique')
          )
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-6 mb-6' },
        React.createElement('div', { className: 'flex items-center mb-4' },
          React.createElement(Settings, { className: 'w-5 h-5 text-indigo-600 mr-2' }),
          React.createElement('h2', { className: 'text-xl font-semibold text-gray-800' }, 'Paramètres de traitement')
        ),
        React.createElement('div', { className: 'grid md:grid-cols-2 gap-6' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Redimensionnement: ' + sizePercent + '%'),
            React.createElement('input', {
              type: 'range',
              min: '10',
              max: '100',
              value: sizePercent,
              onChange: (e) => setSizePercent(Number(e.target.value)),
              className: 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600'
            }),
            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Pourcentage de la taille originale')
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Rééchantillonnage: ' + qualityPercent + '%'),
            React.createElement('input', {
              type: 'range',
              min: '10',
              max: '100',
              value: qualityPercent,
              onChange: (e) => setQualityPercent(Number(e.target.value)),
              className: 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600'
            }),
            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Qualité de compression JPEG')
          )
        )
      ),

      images.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg shadow-lg p-6 mb-6' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-4' }, 'Aperçu des images (' + images.length + ')'),
        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2' },
          images.map((img, idx) =>
            React.createElement('div', { key: idx, className: 'relative border-2 border-gray-200 rounded-lg overflow-hidden hover:border-indigo-400 transition-colors bg-gray-50' },
              React.createElement('img', {
                src: img.preview,
                alt: img.name,
                className: 'w-full h-32 object-cover'
              }),
              React.createElement('div', { className: 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 truncate' }, img.name),
              processed > idx && processing && React.createElement('div', { className: 'absolute top-2 right-2 bg-green-500 rounded-full p-1' },
                React.createElement(Check, { className: 'w-4 h-4 text-white' })
              )
            )
          )
        )
      ),

      React.createElement('button', {
        onClick: handleProcessAndDownload,
        disabled: processing || images.length === 0,
        className: 'w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-green-600 hover:from-indigo-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-5 px-6 rounded-lg transition-all shadow-lg text-lg'
      },
        React.createElement(Download, { className: 'w-6 h-6' }),
        React.createElement('span', null,
          processing 
            ? `Traitement en cours... (${processed}/${images.length})`
            : images.length === 0
            ? 'Sélectionnez un dossier source'
            : `Traiter ${images.length} image${images.length > 1 ? 's' : ''}`
        )
      ),

      React.createElement('div', { className: 'text-center mt-8 text-gray-500 text-sm' },
        React.createElement('p', null, '© 2026 Rechanti - Traitement d\'images simplifié')
      )
    )
  );
}

// Initialiser l'application
console.log('Initializing Rechanti app...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(RechantiApp));
console.log('App rendered');