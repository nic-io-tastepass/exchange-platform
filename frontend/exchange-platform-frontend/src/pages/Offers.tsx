import { useState, useEffect } from 'react';
import { api, Offer } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X } from 'lucide-react';

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const data = await api.getOffers();
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await api.acceptOffer(id);
      await loadOffers();
    } catch (err: any) {
      setError(err.message || 'Failed to accept offer');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await api.declineOffer(id);
      await loadOffers();
    } catch (err: any) {
      setError(err.message || 'Failed to decline offer');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Offers</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No offers yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <Card key={offer.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {offer.listing?.title || 'Listing'}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        From: {offer.fromUser?.name} → To: {offer.toUser?.name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        offer.status === 'accepted'
                          ? 'default'
                          : offer.status === 'declined'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {offer.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Message</h4>
                    <p className="text-gray-700">{offer.message}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Offer Details</h4>
                    <p className="text-gray-700">{offer.offerDetails}</p>
                  </div>
                  {offer.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleAccept(offer.id)} size="sm">
                        <Check className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDecline(offer.id)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
