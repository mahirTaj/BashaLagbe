// Extracted express app for Vercel serverless usage
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
try { require('dotenv').config(); } catch {}
const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const trendsRoute = require('./routes/trends');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const multer = require('multer');
const { validateEnv } = require('./config/validateEnv');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',').map(s=>s.trim()).filter(Boolean);
const devBypass = process.env.DEV_ADMIN_BYPASS === 'true';
app.use(cors({
  origin: (origin, cb) => {
    if (!isProd) return cb(null, true);
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type','Authorization','x-user-id', ...(devBypass?['admin-token']:[])]
}));

const disableCSP = process.env.DISABLE_CSP === 'true';
const extraImg = (process.env.CSP_IMG_EXTRA || '').split(',').map(s=>s.trim()).filter(Boolean);
const extraConnect = (process.env.ALLOW_CONNECT_EXTRA || '').split(',').map(s=>s.trim()).filter(Boolean);
const cspDirectives = {
  defaultSrc:["'self'"],
  scriptSrc:["'self'","'unsafe-inline'","'unsafe-eval'"],
  styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],
  fontSrc:["'self'",'https://fonts.gstatic.com'],
  imgSrc:["'self'",'data:','blob:','https://res.cloudinary.com', ...extraImg],
  mediaSrc:["'self'",'data:','blob:','https://res.cloudinary.com'],
  connectSrc:["'self'",'https://res.cloudinary.com', ...extraConnect],
  objectSrc:["'none'"],
  frameSrc:["'none'"],
  workerSrc:["'self'",'blob:'],
  baseUri:["'self'"],
  formAction:["'self'"],
};
app.use(helmet({ crossOriginResourcePolicy:false, contentSecurityPolicy: disableCSP?false:{useDefaults:false,directives:cspDirectives} }));
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan(isProd?'combined':'dev'));
if (isProd) app.use('/api/', rateLimit({windowMs:15*60*1000,max:100,standardHeaders:true,legacyHeaders:false}));
app.use(express.json({limit:'1mb'}));
const uploadsPath = path.join(__dirname,'uploads');
try { fs.mkdirSync(uploadsPath,{recursive:true}); } catch {}
app.use('/uploads', express.static(uploadsPath));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'BashaLagbe backend',serverless:true}));
app.get('/api/debug/config',(req,res)=>res.json({cspDisabled:disableCSP,cspImgSrc:cspDirectives.imgSrc}));
app.use('/api/auth', authRoute);
app.use('/api/listings', listingsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/trends', trendsRoute);
app.use('/api*',(req,res)=>res.status(404).json({error:'API endpoint not found'}));
app.use((err,req,res,next)=>{ if (err instanceof multer.MulterError) return res.status(413).json({error:'Upload too large'}); if (err) return res.status(500).json({error:err.message||'Server error'}); next(); });

// Connect DB once (cold start) and reuse
let dbPromise;
function ensureDb(){
  if (!dbPromise){
    try { validateEnv(); } catch(e) { console.error(e.message); dbPromise=Promise.reject(e); }
    const uri = process.env.MONGO_URI;
    dbPromise = mongoose.connect(uri).then(()=>console.log('Mongo connected (serverless)')).catch(e=>{console.error('Mongo connect error',e);});
  }
  return dbPromise;
}
app.use((req,res,next)=>{ ensureDb().then(()=>next()).catch(()=>res.status(500).json({error:'DB connection failed'})); });

module.exports = app;
