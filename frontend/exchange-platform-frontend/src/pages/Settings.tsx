import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { startRegistration } from '@simplewebauthn/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Shield } from 'lucide-react';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.updateUser({ name });
      await refreshUser();
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await api.setupTOTP();
      setQrCode(data.qrCode);
      setShowTOTPSetup(true);
    } catch (err: any) {
      setError(err.message || 'Failed to setup TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.verifyTOTP(totpCode);
      await refreshUser();
      setSuccess('Two-factor authentication enabled successfully');
      setShowTOTPSetup(false);
      setQrCode('');
      setTotpCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to verify TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.disableTOTP();
      await refreshUser();
      setSuccess('Two-factor authentication disabled');
    } catch (err: any) {
      setError(err.message || 'Failed to disable TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBiometrics = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const options = await api.getWebAuthnRegisterOptions();
      const credential = await startRegistration(options);
      await api.verifyWebAuthnRegistration(credential);
      await refreshUser();
      setSuccess('Biometric authentication registered successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to setup biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <Button type="submit" disabled={loading}>
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Two-Factor Authentication (TOTP)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.totpEnabled ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Two-factor authentication is currently enabled
                  </p>
                  <Button variant="destructive" onClick={handleDisableTOTP} disabled={loading}>
                    Disable TOTP
                  </Button>
                </div>
              ) : showTOTPSetup ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  {qrCode && (
                    <img src={qrCode} alt="QR Code" className="mb-4 border rounded" />
                  )}
                  <form onSubmit={handleVerifyTOTP} className="space-y-4">
                    <Input
                      placeholder="Enter 6-digit code"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        Verify & Enable
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTOTPSetup(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <Button onClick={handleSetupTOTP} disabled={loading}>
                    Setup TOTP
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Fingerprint className="mr-2 h-5 w-5" />
                Biometric Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.hasWebAuthn ? (
                <p className="text-sm text-gray-600">
                  Biometric authentication is enabled on this device
                </p>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Use fingerprint or face recognition to sign in
                  </p>
                  <Button onClick={handleSetupBiometrics} disabled={loading}>
                    Setup Biometrics
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
