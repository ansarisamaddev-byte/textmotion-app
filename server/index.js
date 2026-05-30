import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import Razorpay from 'razorpay';
import archiver from 'archiver';
import archiverZipEncrypted from 'archiver-zip-encrypted';

// Load env from project root "env" file
dotenv.config({ path: path.resolve(process.cwd(), 'env') });

// Register custom zip format
archiver.registerFormat('zip-encrypted', archiverZipEncrypted);

// Initialize Express App first to prevent initialization crashes
const app = express();
app.use(cors());

// Serve static assets from the Vite build directory (SPA Fallback)
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// Razorpay Instance Setup
const KEY_ID = process.env.KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const razorpay = KEY_ID && KEY_SECRET
  ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
  : null;

// Storage Infrastructure (Render Persistent Disk vs Local Fallback)
const STORAGE_DIR = process.env.RENDER_DISK_MOUNT_PATH 
  ? path.resolve(process.env.RENDER_DISK_MOUNT_PATH, 'storage')
  : path.resolve(process.cwd(), 'server', 'storage');

const EXPORT_DIR = path.resolve(STORAGE_DIR, 'exports');
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// Meta helper utilities
const readMeta = (exportId) => {
  const metaPath = path.resolve(EXPORT_DIR, `${exportId}.json`);
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
};

const writeMeta = (exportId, meta) => {
  const metaPath = path.resolve(EXPORT_DIR, `${exportId}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
};

const genId = () => crypto.randomBytes(12).toString('hex');
const genPassword = () => crypto.randomBytes(9).toString('base64url'); // ~12 chars

// JSON parsing configuration for typical client traffic
app.use('/api', express.json({ limit: '5mb' }));

app.get('/ping', (req, res) => {
  res.send('ok');
});

// Create encrypted zip and return exportId + download URL
app.post('/api/exports', upload.single('video'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'video_missing' });

    const exportId = genId();
    const password = genPassword();
    const zipPath = path.resolve(EXPORT_DIR, `${exportId}.zip`);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver.create('zip-encrypted', {
      zlib: { level: 8 },
      encryptionMethod: 'aes256',
      password
    });

    const finalizeDone = new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
    });

    archive.pipe(output);
    archive.append(file.buffer, { name: 'video.mp4' });
    archive.finalize();
    await finalizeDone;

    writeMeta(exportId, {
      exportId,
      createdAt: Date.now(),
      zipPath,
      password,
      orderId: null,
      paid: false,
    });

    res.json({
      exportId,
      downloadUrl: `/api/exports/${exportId}/download`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'export_failed' });
  }
});

app.get('/api/exports/:id/download', (req, res) => {
  const exportId = req.params.id;
  const meta = readMeta(exportId);
  if (!meta || !fs.existsSync(meta.zipPath)) return res.status(404).end();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="textmotion-${exportId}.zip"`);
  fs.createReadStream(meta.zipPath).pipe(res);
});

app.get('/api/exports/:id/status', (req, res) => {
  const meta = readMeta(req.params.id);
  if (!meta) return res.status(404).json({ error: 'not_found' });
  res.json({
    exportId: meta.exportId,
    paid: !!meta.paid,
    password: meta.paid ? meta.password : null
  });
});

// Create Razorpay order for an export
app.post('/api/payments/order', async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ error: 'razorpay_not_configured' });
    
    const { exportId, amountInr } = req.body || {};
    if (!exportId) return res.status(400).json({ error: 'missing_fields' });

    const meta = readMeta(exportId);
    if (!meta) return res.status(404).json({ error: 'export_not_found' });
    if (meta.paid) return res.status(400).json({ error: 'already_paid' });

    const amountPaise = Math.max(100, Math.round(Number(amountInr || 49) * 100));
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `tm_${exportId}`,
      notes: { exportId }
    });
    meta.orderId = order.id;
    writeMeta(exportId, meta);
    
    res.json({
      keyId: KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      exportId: order.notes.exportId
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'order_failed' });
  }
});

// Webhook must use raw body
app.post('/api/webhooks/razorpay', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    if (!WEBHOOK_SECRET) return res.status(500).send('webhook_secret_missing');
    let event;
    if (Buffer.isBuffer(req.body)) {
      event = JSON.parse(req.body.toString('utf8'));
    } else {
      event = req.body;
    }

    if (Buffer.isBuffer(req.body)) {
      const sig = req.headers['x-razorpay-signature'];
      const expected = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');
      if (sig !== expected) return res.status(400).send('invalid_signature');
    }
    if (event?.event !== 'payment.captured') return res.status(200).send('ignored');

    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;
    if (!orderId) return res.status(200).send('no_order');

    // Find export by orderId
    const files = fs.readdirSync(EXPORT_DIR).filter(f => f.endsWith('.json'));
    const match = files.find((f) => {
      const meta = JSON.parse(fs.readFileSync(path.resolve(EXPORT_DIR, f), 'utf8'));
      return meta.orderId === orderId;
    });
    if (!match) return res.status(200).send('no_export');

    const exportId = match.replace(/\.json$/, '');
    const meta = readMeta(exportId);
    if (!meta) return res.status(200).send('no_meta');

    meta.paid = true;
    writeMeta(exportId, meta);

    res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
  }
});

// Fallback SPA routing wildcard layout for production builds
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ping')) {
      res.sendFile(path.resolve(DIST_DIR, 'index.html'));
    }
  });
}

// Active UI client connections tracker mapping exportId -> res
let uiClients = {};

/**
 * 1. UI SSE CONNECTION STREAM TUNNEL
 * Your React frontend opens an EventSource connection here right after video upload
 */
app.get('/api/stream-transcription/:exportId', (req, res) => {
  const { exportId } = req.params;

  // Set mandatory streaming configuration headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Save this client connection response hook into our in-memory layer lookup map
  uiClients[exportId] = res;
  console.log(`[SSE] UI Client connected waiting for export track: ${exportId}`);

  // Clean up references cleanly when the user navigates away or closes the browser tab
  req.on('close', () => {
    delete uiClients[exportId];
    console.log(`[SSE] UI Client connection dropped for export track: ${exportId}`);
  });
});

/**
 * 2. WEBHOOK RECEIVER & PASSTHROUGH ROUTER
 * Catches incoming payloads from GitHub Action cloud containers and immediately 
 * pipes the arrays directly to the waiting browser socket.
 */
app.post('/api/webhook/transcription-completed/:exportId', (req, res) => {
  try {
    const { exportId } = req.params;
    const { status, transcript, words } = req.body || {};

    console.log(`[Webhook] Caught GitHub runner response for item: ${exportId}, Status: ${status}`);

    if (status !== 'completed') {
      return res.status(400).json({ error: 'invalid_status_from_runner' });
    }

    // Verify if an active frontend browser screen is open and listening to the stream
    const clientResponse = uiClients[exportId];

    if (clientResponse) {
      // 🚀 PIPE IT STRAGHT TO THE UI STATE INTERFACE LAYER!
      clientResponse.write(`data: ${JSON.stringify({ status, transcript, words })}\n\n`);
      console.log(`[SSE System] Successfully blasted data matrix to frontend UI state for ${exportId}`);
      
      // Close the specific client connection stream cleanly
      clientResponse.end();
      delete uiClients[exportId];
    } else {
      // Fallback: If user refreshed or closed out prematurely, log it
      console.warn(`[SSE Warning] Webhook arrived but no active UI window state listening for exportId: ${exportId}`);
    }

    // Always signal an explicit 200 OK back to GitHub runner environment so worker node stops cleanly
    res.status(200).json({ success: true, received: true });

  } catch (error) {
    console.error('[Webhook Critical Error] Pipeline crashed processing data transmission:', error);
    res.status(500).json({ error: 'internal_processing_failed' });
  }
});

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

// ==========================================
// AUTOMATED STORAGE CLEANUP (SAFE GARBAGE COLLECTOR)
// ==========================================

function cleanExpiredExports() {
  try {
    const NOW = Date.now();
    const LIFESPAN_MS = 60 * 60 * 1000; // 1 Hour lifespan

    if (!fs.existsSync(EXPORT_DIR)) return;

    const files = fs.readdirSync(EXPORT_DIR);
    let deletedCount = 0;

    // Filter to handle metadata items as primary sources
    const metadataFiles = files.filter(f => f.endsWith('.json'));

    metadataFiles.forEach((metaFile) => {
      const metaPath = path.resolve(EXPORT_DIR, metaFile);
      
      try {
        if (!fs.existsSync(metaPath)) return;
        
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const fileAgeMs = NOW - (meta.createdAt || 0);

        if (fileAgeMs > LIFESPAN_MS) {
          const exportId = metaFile.replace(/\.json$/, '');
          const associatedZipPath = path.resolve(EXPORT_DIR, `${exportId}.zip`);

          // Remove binary payload first
          if (fs.existsSync(associatedZipPath)) {
            fs.unlinkSync(associatedZipPath);
          }
          
          // Remove control ledger file second
          if (fs.existsSync(metaPath)) {
            fs.unlinkSync(metaPath);
          }

          deletedCount++;
        }
      } catch (fileErr) {
        console.error(`[GC CLEANUP] Skipping file ${metaFile} due to read error:`, fileErr.message);
      }
    });

    if (deletedCount > 0) {
      console.log(`[GC CLEANUP] Successfully swept ${deletedCount} expired export tracking items.`);
    }
  } catch (err) {
    console.error('[GC CLEANUP] Core error caught during automated file purging:', err);
  }
}

// Automatically execute cleaner routine every 10 minutes
setInterval(cleanExpiredExports, 10 * 60 * 1000);