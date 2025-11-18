import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, Thread, Message } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export default function Messages() {
  const { threadId } = useParams<{ threadId?: string }>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (threadId) {
      loadThread(threadId);
    }
  }, [threadId]);

  const loadThreads = async () => {
    try {
      const data = await api.getThreads();
      setThreads(data);
      if (threadId) {
        const thread = data.find((t) => t.id === threadId);
        if (thread) setSelectedThread(thread);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (id: string) => {
    try {
      const data = await api.getMessages(id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !newMessage.trim()) return;

    try {
      await api.sendMessage(selectedThread.id, newMessage);
      setNewMessage('');
      await loadThread(selectedThread.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSelectThread = (thread: Thread) => {
    setSelectedThread(thread);
    loadThread(thread.id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {threads.length === 0 ? (
                <p className="text-sm text-gray-600">No conversations yet</p>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`p-3 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedThread?.id === thread.id ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleSelectThread(thread)}
                  >
                    <p className="font-semibold">{thread.otherUser?.name || 'Unknown'}</p>
                    {thread.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {thread.lastMessage.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            {selectedThread ? (
              <>
                <CardHeader>
                  <CardTitle>{selectedThread.otherUser?.name || 'Conversation'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.senderId === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button type="submit">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-gray-600">Select a conversation to start messaging</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
