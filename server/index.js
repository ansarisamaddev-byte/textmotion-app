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

// Active UI client connections tracker mapping exportId -> res
let uiClients = {};

// Razorpay Instance Setup
const KEY_ID = process.env.KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const razorpay = KEY_ID && KEY_SECRET
  ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
  : null;

app.get('/ping', (req, res) => {
  res.send('ok');
});

// ==========================================
// CORE PROJECT API ENDPOINTS
// ==========================================

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

// Razorpay Webhook
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

// ==========================================
// TRANSCRIPTION PIPELINE ENGINE PORTS
// ==========================================

/**
 * 1. UI SSE CONNECTION STREAM TUNNEL
 * Opened by React right after file initialization to drop latency parameters
 */
app.get('/api/stream-transcription/:exportId', (req, res) => {
  const { exportId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  uiClients[exportId] = res;
  console.log(`[SSE] UI Client connected waiting for export track: ${exportId}`);

  req.on('close', () => {
    delete uiClients[exportId];
    console.log(`[SSE] UI Client connection dropped for export track: ${exportId}`);
  });
});

/**
 * 2. FRONTEND UI PROXY TRIGGER
 * Kicks off GitHub Actions engine pipeline containers cleanly using safe tokens
 */
app.post('/api/transcribe-ui-trigger', express.json(), async (req, res) => {
  try {
    const { exportId } = req.body || {};
    if (!exportId) return res.status(400).json({ error: 'missing_export_tracking_id' });

    const meta = readMeta(exportId);
    if (!meta) return res.status(404).json({ error: 'export_not_found' });

    const GITHUB_PAT = process.env.GITHUB_PAT;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const WORKFLOW_ID = 'transcribe.yml';

    if (!GITHUB_PAT || !REPO_OWNER || !REPO_NAME) {
      console.error("❌ Environment variables missing on Render panel.");
      return res.status(500).json({ error: 'github_orchestration_not_configured' });
    }

    const targetUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`;
    console.log(`[GitHub API] Hitting target URL: ${targetUrl}`);

    const ghResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_PAT.trim()}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'TextMotion-Express-Engine'
      },
      body: JSON.stringify({
        ref: 'main', 
        inputs: {
          exportId: String(exportId),
          videoUrl: `${process.env.HOST_URL || 'https://textmotion-app.onrender.com'}/api/exports/${exportId}/download`
        }
      })
    });

    if (!ghResponse.ok) {
      const errorText = await ghResponse.text();
      console.error(`❌ GitHub Response Error: ${ghResponse.status} - ${errorText}`);
      return res.status(ghResponse.status).json({ error: errorText });
    }

    console.log(`[GitHub API] Success! Workflow triggered for exportId: ${exportId}`);
    return res.status(202).json({ success: true });

  } catch (error) {
    console.error('❌ Critical Crash inside Trigger Route:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. WEBHOOK RECEIVER & PASSTHROUGH ROUTER
 * Catches incoming payloads from GitHub Actions and pipes them instantly to the client browser
 */
app.post('/api/webhook/transcription-completed/:exportId', (req, res) => {
  try {
    const { exportId } = req.params;
    const { status, transcript, words } = req.body || {};

    console.log(`[Webhook] Caught GitHub runner response for item: ${exportId}, Status: ${status}`);

    if (status !== 'completed') {
      return res.status(400).json({ error: 'invalid_status_from_runner' });
    }

    const clientResponse = uiClients[exportId];

    if (clientResponse) {
      clientResponse.write(`data: ${JSON.stringify({ status, transcript, words })}\n\n`);
      console.log(`[SSE System] Successfully blasted data matrix to frontend UI state for ${exportId}`);
      
      clientResponse.end();
      delete uiClients[exportId];
    } else {
      console.warn(`[SSE Warning] Webhook arrived but no active UI window state listening for exportId: ${exportId}`);
    }

    res.status(200).json({ success: true, received: true });

  } catch (error) {
    console.error('[Webhook Critical Error] Pipeline crashed processing data transmission:', error);
    res.status(500).json({ error: 'internal_processing_failed' });
  }
});

// ==========================================
// SPA PRODUCTION FRONTEND WILDCARD CATCH-ALL
// ==========================================
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ping')) {
      res.sendFile(path.resolve(DIST_DIR, 'index.html'));
    }
  });
}

// ==========================================
// SERVER INITIALIZATION
// ==========================================
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

          if (fs.existsSync(associatedZipPath)) {
            fs.unlinkSync(associatedZipPath);
          }
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

setInterval(cleanExpiredExports, 10 * 60 * 1000);