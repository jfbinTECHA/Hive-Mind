'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function AuthScreen() {
  const { dispatch } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      dispatch({ type: 'SET_USER', payload: { id: '1', name: username } });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      setIsLoading(false);
    }, 1000);
  };

  const handleGuestLogin = () => {
    dispatch({ type: 'SET_USER', payload: { id: 'guest', name: 'Guest' } });
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            AI Hive Mind
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with your AI companions
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleGuestLogin}
              className="w-full"
            >
              Continue as Guest
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}