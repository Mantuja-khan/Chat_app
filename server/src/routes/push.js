import express from 'express';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const pushRouter = express.Router();

// Store subscriptions (in production, use a database)
const subscriptions = new Map();

// Subscribe endpoint
pushRouter.post('/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    subscriptions.set(userId, subscription);
    res.status(201).json({ message: 'Subscription added successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// Send notification
export async function sendPushNotification(userId, title, message, url) {
  try {
    const subscription = subscriptions.get(userId);
    if (!subscription) return;

    const payload = JSON.stringify({
      title,
      message,
      url
    });

    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    console.error('Push notification error:', error);
    if (error.statusCode === 410) {
      // Subscription has expired or is invalid
      subscriptions.delete(userId);
    }
  }
}