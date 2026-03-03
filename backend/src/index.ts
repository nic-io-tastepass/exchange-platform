import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import listingsRoutes from './routes/listings';
import offersRoutes from './routes/offers';
import messagesRoutes from './routes/messages';
import usersRoutes from './routes/users';
import billingRoutes from './routes/billing';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({
  verify: (req: any, _res, buf) => {
    // Preserve the raw body buffer for webhook signature verification
    req.rawBody = buf;
  },
}));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/billing', billingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Exchange Platform API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origin: ${process.env.ORIGIN || 'http://localhost:5173'}`);
});
