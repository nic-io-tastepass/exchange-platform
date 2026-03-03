import { useState, useEffect } from 'react';
import { api, Plan, Subscription, Payment } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Check, X, Clock, ArrowRight } from 'lucide-react';

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subData, paymentsData] = await Promise.all([
        api.getPlans(),
        api.getSubscription(),
        api.getPayments(),
      ]);
      setPlans(plansData);
      setSubscription(subData.subscription);
      setPayments(paymentsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load billing data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const result = await api.subscribe(planId, billingInterval);

      if (result.checkoutUrl) {
        // Redirect to Revolut checkout
        window.location.href = result.checkoutUrl;
        return;
      }

      if (result.subscription) {
        setSubscription(result.subscription);
        setSuccess('Subscription updated successfully!');
      }

      if (result.warning) {
        setSuccess(result.warning);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const result = await api.cancelSubscription();
      setSubscription(result.subscription);
      setSuccess(result.message || 'Subscription cancelled');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const result = await api.resumeSubscription();
      setSubscription(result.subscription);
      setSuccess('Subscription resumed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resume subscription';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Billing</h1>
            <p className="text-gray-500 mt-1">Manage your subscription and payments</p>
          </div>
          <CreditCard className="h-8 w-8 text-gray-400" />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Current Subscription */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Current Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold">{subscription.plan.displayName}</span>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                    {subscription.cancelAtPeriodEnd && (
                      <Badge variant="destructive">Cancelling</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {subscription.billingInterval === 'yearly' ? 'Annual' : 'Monthly'} billing
                    {' \u00b7 '}
                    Current period ends {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {subscription.cancelAtPeriodEnd ? (
                    <Button onClick={handleResume} disabled={actionLoading} variant="default">
                      Resume Subscription
                    </Button>
                  ) : (
                    subscription.plan.name !== 'free' && (
                      <Button onClick={handleCancel} disabled={actionLoading} variant="destructive">
                        Cancel Subscription
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center rounded-lg bg-gray-100 p-1">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingInterval === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setBillingInterval('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingInterval === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setBillingInterval('yearly')}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600 font-semibold">Save ~20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => {
            const price = billingInterval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const isCurrentPlan = subscription?.plan.id === plan.id;
            const isCurrentInterval = subscription?.billingInterval === billingInterval;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.highlighted ? 'border-2 border-blue-500 shadow-lg' : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="flex-1">
                  <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {price === 0 ? 'Free' : formatPrice(price, plan.currency)}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-500 text-sm">
                        /{billingInterval === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-auto"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    disabled={actionLoading || (isCurrentPlan && isCurrentInterval)}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {isCurrentPlan && isCurrentInterval ? (
                      'Current Plan'
                    ) : isCurrentPlan ? (
                      <>Switch to {billingInterval}</>
                    ) : subscription ? (
                      <>
                        Switch to {plan.displayName}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <>
            <Separator className="mb-8" />
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment History</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between px-6 py-4"
                      >
                        <div>
                          <p className="font-medium">{payment.description || 'Payment'}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {formatPrice(payment.amount, payment.currency)}
                          </span>
                          <Badge
                            variant={
                              payment.status === 'completed'
                                ? 'default'
                                : payment.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {payment.status === 'completed' && <Check className="mr-1 h-3 w-3" />}
                            {payment.status === 'failed' && <X className="mr-1 h-3 w-3" />}
                            {payment.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
