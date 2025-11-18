import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Listing } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [offerDetails, setOfferDetails] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      const data = await api.getListing(id!);
      setListing(data);
    } catch (error) {
      console.error('Failed to load listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.createOffer({
        listingId: id!,
        message: offerMessage,
        offerDetails,
      });
      setSuccess('Offer sent successfully!');
      setShowOfferForm(false);
      setOfferMessage('');
      setOfferDetails('');
    } catch (err: any) {
      setError(err.message || 'Failed to send offer');
    }
  };

  const handleMessage = async () => {
    if (!listing?.user) return;
    try {
      const thread = await api.createThread(listing.user.id, listing.id);
      navigate(`/messages/${thread.id}`);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!listing) {
    return <div className="min-h-screen flex items-center justify-center">Listing not found</div>;
  }

  const isOwner = user?.id === listing.userId;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Listings
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{listing.title}</CardTitle>
                <p className="text-gray-600 mt-2">{listing.category}</p>
              </div>
              <Badge variant={listing.type === 'good' ? 'default' : 'secondary'}>
                {listing.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{listing.description}</p>
            </div>

            {listing.user && (
              <div>
                <h3 className="font-semibold mb-2">Posted by</h3>
                <p className="text-gray-700">{listing.user.name}</p>
                <p className="text-sm text-gray-500">{listing.user.email}</p>
              </div>
            )}

            {!isOwner && user && (
              <div className="flex gap-2">
                <Button onClick={() => setShowOfferForm(!showOfferForm)} className="flex-1">
                  Make an Offer
                </Button>
                <Button variant="outline" onClick={handleMessage}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </div>
            )}

            {showOfferForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Make an Offer</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleMakeOffer} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert>
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-2">Message</label>
                      <Textarea
                        placeholder="Introduce yourself and your offer..."
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Offer Details</label>
                      <Input
                        placeholder="What are you offering in exchange?"
                        value={offerDetails}
                        onChange={(e) => setOfferDetails(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Send Offer</Button>
                      <Button type="button" variant="outline" onClick={() => setShowOfferForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
