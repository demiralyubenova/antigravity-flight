import { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  AnimatedForm,
  ClothingOrbitDisplay,
  Ripple,
} from '@/components/ui/modern-animated-sign-in';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  const loginFields = [
    {
      label: 'Email',
      required: true,
      type: 'email' as const,
      placeholder: 'you@example.com',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      value: email,
    },
    {
      label: 'Password',
      required: true,
      type: 'password' as const,
      placeholder: '••••••••',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      value: password,
    },
  ];

  const signupFields = [
    {
      label: 'Name',
      required: false,
      type: 'text' as const,
      placeholder: 'Your name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value),
      value: displayName,
    },
    ...loginFields,
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Side - Orbiting Animation */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-muted/30 overflow-hidden">
        <Ripple mainCircleSize={180} numCircles={8} mainCircleOpacity={0.15} />
        <div className="relative z-10 w-full h-[600px]">
          <ClothingOrbitDisplay text="The Atelier" />
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-4xl font-medium tracking-tight mb-2">
              The Atelier
            </h1>
            <p className="text-muted-foreground">Your AI-powered wardrobe</p>
          </div>

          <AnimatedForm
            header={isLogin ? 'Welcome back' : 'Create your account'}
            subHeader={isLogin ? 'Sign in to your AI-powered wardrobe' : 'Start curating your perfect wardrobe'}
            fields={isLogin ? loginFields : signupFields}
            submitButton={isLogin ? 'Sign In' : 'Create Account'}
            textVariantButton={isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            errorField={error}
            onSubmit={handleSubmit}
            goTo={toggleMode}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
