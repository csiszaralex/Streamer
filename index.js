const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const rootDir = process.env.ROOT_DIR.replace('@/', path.parse(process.cwd()).root);

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use((req, res, next) => {
  console.log(`CALL: ${new Date().toISOString()} ${req.path}`);
  next();
});

app.get('/stream/*', (req, res) => {
  const paths = req.params[0];
  const filePath = path.join(rootDir, ...paths.split('/'));

  if (!fs.existsSync(filePath)) return res.status(404).send('A fájl nem található.');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : Math.min(fileSize - 1, start + 10 * 1000 * 1000);
    // console.log(`Wanted: ${range}, start: ${start}, end: ${end}`);

    if (start >= fileSize) return res.status(416).send('Requested range not satisfiable');

    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fileStream.pipe(res);
    res.setTimeout(30000, () => {
      console.log('Kapcsolat időtúllépés miatt lezárva.');
      res.end();
    });
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

app.get('/play/*', (req, res) => {
  const paths = req.params[0].split('/');
  const folder = paths.slice(0, -1).join('/');
  const file = paths.slice(-1)[0];

  const { nextFile, prevFile } = getAdjacentFiles(folder, file);

  console.log(folder);

  res.render('play', {
    title: file.split('.').slice(0, -1).join('.'),
    folder: folder,
    file: file,
    prevFile,
    nextFile,
  });
});

app.get('/adjacent/*', (req, res) => {
  const paths = req.params[0].split('/');
  const folder = paths.slice(0, -1).join('/');
  const file = paths.slice(-1)[0];

  res.json(getAdjacentFiles(folder, file));
});

app.get('/download/*', (req, res) => {
  const paths = req.params[0];
  const filePath = path.join(rootDir, ...paths.split('/'));

  if (!fs.existsSync(filePath)) return res.status(404).send('A fájl nem található.');

  res.download(filePath);
});

app.get('/*', (req, res) => {
  const folder = (req.params[0].endsWith('/') ? req.params[0].slice(0, -1) : req.params[0]) + '/';
  const splitted = folder.split('/').filter((x) => x !== '');
  const folderPath = path.join(rootDir, ...folder.split('/'));
  const folders = fs
    .readdirSync(folderPath)
    .filter((file) => fs.statSync(path.join(folderPath, file)).isDirectory());

  const files = fs.readdirSync(folderPath).filter((file) => file.endsWith('.mp4'));

  const parents =
    splitted.length === 0
      ? []
      : splitted.reduce(
          (acc, curr, index) => {
            if (index === splitted.length - 1) return acc;
            return [
              ...acc,
              {
                name: curr,
                path: acc[index].path + curr + '/',
              },
            ];
          },
          [{ name: 'Videos', path: '/' }]
        );

  res.render('index', {
    currentPath: folder == '/' ? '' : folder,
    parents,
    folders,
    files,
    title: splitted.length !== 0 ? splitted[splitted.length - 1] : 'Videos',
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function getAdjacentFiles(dirPath, currentFile) {
  const folderPath = path.join(rootDir, dirPath);
  const files = fs.readdirSync(folderPath).filter((file) => file.endsWith('.mp4'));
  const index = files.indexOf(currentFile);
  const adjacentFiles = { nextFile: null, prevFile: null };
  if (index === -1) return adjacentFiles;
  if (index > 0) adjacentFiles.prevFile = `${dirPath}/${files[index - 1]}`;
  if (index < files.length - 1) adjacentFiles.nextFile = `${dirPath}/${files[index + 1]}`;

  return adjacentFiles;
}
