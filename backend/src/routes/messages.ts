import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Thread, Message } from '../types';

const router = express.Router();

router.get('/threads', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const threads = db.getThreadsByUser(req.userId!);
    
    const threadsWithDetails = threads.map(thread => {
      const otherParticipantId = thread.participants.find(p => p !== req.userId);
      const otherUser = otherParticipantId ? db.getUserById(otherParticipantId) : null;
      const messages = db.getMessagesByThread(thread.id);
      const lastMessage = messages[messages.length - 1];
      
      return {
        ...thread,
        otherUser: otherUser ? { id: otherUser.id, name: otherUser.name } : null,
        lastMessage: lastMessage || null,
        messageCount: messages.length,
      };
    });

    res.json(threadsWithDetails);
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

router.post('/threads', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const { participantId, listingId } = req.body;

    if (!participantId) {
      res.status(400).json({ error: 'Participant ID is required' });
      return;
    }

    if (participantId === req.userId) {
      res.status(400).json({ error: 'Cannot create thread with yourself' });
      return;
    }

    const otherUser = db.getUserById(participantId);
    if (!otherUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existingThreads = db.getThreadsByUser(req.userId!);
    const existingThread = existingThreads.find(t => 
      t.participants.includes(participantId) && 
      (!listingId || t.listingId === listingId)
    );

    if (existingThread) {
      res.json(existingThread);
      return;
    }

    const thread: Thread = {
      id: uuidv4(),
      participants: [req.userId!, participantId],
      listingId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.createThread(thread);

    res.status(201).json(thread);
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

router.get('/threads/:id/messages', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const thread = db.getThreadById(req.params.id);
    
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    if (!thread.participants.includes(req.userId!)) {
      res.status(403).json({ error: 'Not authorized to view this thread' });
      return;
    }

    const messages = db.getMessagesByThread(req.params.id);
    
    const messagesWithSender = messages.map(message => {
      const sender = db.getUserById(message.senderId);
      return {
        ...message,
        sender: sender ? { id: sender.id, name: sender.name } : null,
      };
    });

    res.json(messagesWithSender);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/threads/:id/messages', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const thread = db.getThreadById(req.params.id);
    
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    if (!thread.participants.includes(req.userId!)) {
      res.status(403).json({ error: 'Not authorized to send messages in this thread' });
      return;
    }

    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const message: Message = {
      id: uuidv4(),
      threadId: req.params.id,
      senderId: req.userId!,
      content,
      createdAt: new Date(),
    };

    db.createMessage(message);

    const sender = db.getUserById(message.senderId);

    res.status(201).json({
      ...message,
      sender: sender ? { id: sender.id, name: sender.name } : null,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
