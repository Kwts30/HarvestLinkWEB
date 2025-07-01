import express from 'express';
const router = express.Router();
import ContactMessage from '../../models/contactMessage.js';

// POST /api/messages - Save a new contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const newMessage = new ContactMessage({ name, email, phone, message });
    await newMessage.save();
    res.status(201).json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

// GET /api/messages - Get all contact messages (admin)
router.get('/', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
});

// DELETE /api/messages/:id - Delete a contact message
router.delete('/:id', async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
});

// PUT /api/messages/:id/complete - Mark a message as complete
router.put('/:id/complete', async (req, res) => {
  try {
    const updated = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'complete' },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

export default router;
