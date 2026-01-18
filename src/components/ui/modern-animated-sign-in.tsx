import {
  memo,
  ReactNode,
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  forwardRef,
} from 'react';
import {
  motion,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
} from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== AnimatedInput Component ====================

const AnimatedInput = memo(
  forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function AnimatedInput({ className, type, ...props }, ref) {
      const radius = 100;
      const [visible, setVisible] = useState(false);

      const mouseX = useMotionValue(0);
      const mouseY = useMotionValue(0);

      function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
      }: React.MouseEvent<HTMLDivElement>) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
      }

      return (
        <motion.div
          style={{
            background: useMotionTemplate`
              radial-gradient(
                ${visible ? radius + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px,
                hsl(var(--primary)),
                transparent 80%
              )
            `,
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          className="group/input rounded-lg p-[2px] transition duration-300"
        >
          <input
            type={type}
            className={cn(
              `flex h-10 w-full border-none bg-muted shadow-input rounded-md px-3 py-2 text-sm
               file:border-0 file:bg-transparent file:text-sm file:font-medium
               placeholder:text-muted-foreground/60
               focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-primary
               disabled:cursor-not-allowed disabled:opacity-50
               dark:shadow-[0px_0px_1px_1px_hsl(var(--border))]
               group-hover/input:shadow-none transition duration-400`,
              className
            )}
            ref={ref}
            {...props}
          />
        </motion.div>
      );
    }
  )
);

AnimatedInput.displayName = 'AnimatedInput';

// ==================== BoxReveal Component ====================

type BoxRevealProps = {
  children: ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  overflow?: string;
  position?: string;
  className?: string;
};

const BoxReveal = memo(function BoxReveal({
  children,
  width = 'fit-content',
  boxColor,
  duration,
  overflow = 'hidden',
  position = 'relative',
  className,
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      slideControls.start('visible');
      mainControls.start('visible');
    } else {
      slideControls.start('hidden');
      mainControls.start('hidden');
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <div
      ref={ref}
      style={{
        position: position as 'relative' | 'absolute',
        width,
        overflow: overflow as 'hidden' | 'visible',
      }}
      className={className}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: duration || 0.5, delay: 0.25 }}
      >
        {children}
      </motion.div>
      <motion.div
        variants={{
          hidden: { left: 0 },
          visible: { left: '100%' },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: duration || 0.5, ease: 'easeIn' }}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor || 'hsl(var(--primary))',
        }}
      />
    </div>
  );
});

// ==================== Ripple Component ====================

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
};

const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 11,
  className = '',
}: RippleProps) {
  return (
    <div
      className={cn(
        'pointer-events-none select-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]',
        className
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.03;
        const animationDelay = `${i * 0.06}s`;
        const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid';
        const borderOpacity = 5 + i * 5;

        return (
          <div
            key={i}
            className="absolute animate-ripple rounded-full bg-primary/25 shadow-xl border"
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                animationDelay,
                borderStyle,
                borderWidth: '1px',
                borderColor: `hsl(var(--primary) / ${borderOpacity / 100})`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(1)',
                '--i': i,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
});

// ==================== OrbitingCircles Component ====================

type OrbitingCirclesProps = {
  className?: string;
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
};

const OrbitingCircles = memo(function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-border stroke-1"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      <div
        style={
          {
            '--duration': duration,
            '--radius': radius,
            '--delay': -delay,
          } as React.CSSProperties
        }
        className={cn(
          'absolute flex size-full transform-gpu animate-orbit items-center justify-center rounded-full border bg-background [animation-delay:calc(var(--delay)*1000ms)]',
          { '[animation-direction:reverse]': reverse },
          className
        )}
      >
        {children}
      </div>
    </>
  );
});

// ==================== TechOrbitDisplay Component ====================

type IconConfig = {
  className?: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
  component: () => React.ReactNode;
};

type TechnologyOrbitDisplayProps = {
  iconsArray: IconConfig[];
  text?: string;
};

const TechOrbitDisplay = memo(function TechOrbitDisplay({
  iconsArray,
  text = 'The Atelier',
}: TechnologyOrbitDisplayProps) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-foreground to-muted-foreground/80 bg-clip-text text-center text-5xl md:text-7xl font-display leading-none text-transparent">
        {text}
      </span>

      {iconsArray.map((icon, index) => (
        <OrbitingCircles
          key={index}
          className={icon.className}
          duration={icon.duration}
          delay={icon.delay}
          radius={icon.radius}
          path={icon.path}
          reverse={icon.reverse}
        >
          {icon.component()}
        </OrbitingCircles>
      ))}
    </div>
  );
});

// ==================== AnimatedForm Component ====================

type FieldType = 'text' | 'email' | 'password';

type Field = {
  label: string;
  required?: boolean;
  type: FieldType;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value?: string;
};

type AnimatedFormProps = {
  header: string;
  subHeader?: string;
  fields: Field[];
  submitButton: string;
  textVariantButton?: string;
  errorField?: string;
  fieldPerRow?: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  googleLogin?: string;
  goTo?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
};

type Errors = {
  [key: string]: string;
};

const AnimatedForm = memo(function AnimatedForm({
  header,
  subHeader,
  fields,
  submitButton,
  textVariantButton,
  errorField,
  fieldPerRow = 1,
  onSubmit,
  googleLogin,
  goTo,
  loading = false,
}: AnimatedFormProps) {
  const [visible, setVisible] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<Errors>({});

  const toggleVisibility = (label: string) => {
    setVisible((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const validateForm = (event: FormEvent<HTMLFormElement>) => {
    const currentErrors: Errors = {};
    fields.forEach((field) => {
      const value = (event.target as HTMLFormElement)[field.label]?.value;

      if (field.required && !value) {
        currentErrors[field.label] = `${field.label} is required`;
      }

      if (field.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
        currentErrors[field.label] = 'Invalid email address';
      }

      if (field.type === 'password' && value && value.length < 6) {
        currentErrors[field.label] =
          'Password must be at least 6 characters long';
      }
    });
    return currentErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formErrors = validateForm(event);

    if (Object.keys(formErrors).length === 0) {
      onSubmit(event);
    } else {
      setErrors(formErrors);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto rounded-2xl p-6 md:p-8 shadow-elegant-lg bg-card border border-border">
      <BoxReveal width="100%">
        <h2 className="font-display text-2xl text-foreground">
          {header}
        </h2>
      </BoxReveal>

      {subHeader && (
        <BoxReveal width="100%">
          <p className="text-muted-foreground text-sm mt-2">
            {subHeader}
          </p>
        </BoxReveal>
      )}

      {googleLogin && (
        <>
          <BoxReveal width="100%" className="mt-6">
            <button
              type="button"
              className="relative group/btn flex items-center justify-center w-full rounded-lg h-10 font-medium border border-border hover:bg-muted transition-colors"
              onClick={() => console.log('Google login clicked')}
            >
              <span className="flex items-center gap-2 text-muted-foreground text-sm">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLogin}
              </span>
              <BottomGradient />
            </button>
          </BoxReveal>

          <BoxReveal width="100%" className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>
          </BoxReveal>
        </>
      )}

      <form className="mt-6" onSubmit={handleSubmit}>
        <div
          className="flex flex-col gap-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${fieldPerRow}, minmax(0, 1fr))`,
          }}
        >
          {fields.map((field) => (
            <div key={field.label} className="flex flex-col space-y-2">
              <BoxReveal width="100%">
                <label
                  htmlFor={field.label}
                  className="text-sm font-medium text-foreground"
                >
                  {field.label} {field.required && <span className="text-primary">*</span>}
                </label>
              </BoxReveal>

              <BoxReveal width="100%">
                <div className="relative">
                  <AnimatedInput
                    id={field.label}
                    name={field.label}
                    placeholder={field.placeholder}
                    type={
                      field.type === 'password'
                        ? visible[field.label]
                          ? 'text'
                          : 'password'
                        : field.type
                    }
                    onChange={field.onChange}
                    value={field.value}
                    required={field.required}
                    autoComplete={field.type === 'password' ? 'current-password' : field.type === 'email' ? 'email' : 'off'}
                  />

                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => toggleVisibility(field.label)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {visible[field.label] ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  )}
                </div>

                <div className="min-h-5 mt-1">
                  {errors[field.label] && (
                    <p className="text-destructive text-xs">
                      {errors[field.label]}
                    </p>
                  )}
                </div>
              </BoxReveal>
            </div>
          ))}
        </div>

        <BoxReveal width="100%">
          {errorField && (
            <p className="text-destructive text-sm mb-4">{errorField}</p>
          )}
        </BoxReveal>

        <BoxReveal width="100%">
          <button
            className="relative group/btn w-full h-10 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Loading...' : submitButton} {!loading && '→'}
            <BottomGradient />
          </button>
        </BoxReveal>

        {textVariantButton && goTo && (
          <BoxReveal width="100%" className="mt-4">
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={goTo}
                className="text-primary hover:underline font-medium"
              >
                {textVariantButton}
              </button>
            </p>
          </BoxReveal>
        )}
      </form>
    </div>
  );
});

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-primary to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-primary to-transparent" />
    </>
  );
};

// ==================== ClothingOrbitDisplay Component ====================

type ClothingOrbitDisplayProps = {
  text?: string;
};

const ClothingOrbitDisplay = memo(function ClothingOrbitDisplay({
  text = 'The Atelier',
}: ClothingOrbitDisplayProps) {
  // Clothing-themed icons using emoji/text for simplicity
  const clothingIcons: IconConfig[] = [
    {
      component: () => <span className="text-2xl">👕</span>,
      className: 'size-[40px] border-none bg-transparent',
      duration: 25,
      delay: 0,
      radius: 100,
      path: false,
      reverse: false,
    },
    {
      component: () => <span className="text-2xl">👖</span>,
      className: 'size-[40px] border-none bg-transparent',
      duration: 25,
      delay: 12,
      radius: 100,
      path: false,
      reverse: false,
    },
    {
      component: () => <span className="text-3xl">👗</span>,
      className: 'size-[50px] border-none bg-transparent',
      radius: 170,
      duration: 30,
      delay: 0,
      path: false,
      reverse: true,
    },
    {
      component: () => <span className="text-3xl">🧥</span>,
      className: 'size-[50px] border-none bg-transparent',
      radius: 170,
      duration: 30,
      delay: 15,
      path: false,
      reverse: true,
    },
    {
      component: () => <span className="text-2xl">👟</span>,
      className: 'size-[40px] border-none bg-transparent',
      duration: 20,
      delay: 5,
      radius: 130,
      path: false,
      reverse: false,
    },
    {
      component: () => <span className="text-2xl">👠</span>,
      className: 'size-[40px] border-none bg-transparent',
      duration: 20,
      delay: 15,
      radius: 130,
      path: false,
      reverse: false,
    },
    {
      component: () => <span className="text-3xl">👜</span>,
      className: 'size-[50px] border-none bg-transparent',
      radius: 220,
      duration: 35,
      delay: 0,
      path: false,
      reverse: false,
    },
    {
      component: () => <span className="text-3xl">🎩</span>,
      className: 'size-[50px] border-none bg-transparent',
      radius: 220,
      duration: 35,
      delay: 17,
      path: false,
      reverse: false,
    },
    {
      component: () => <span className="text-3xl">🧣</span>,
      className: 'size-[50px] border-none bg-transparent',
      radius: 270,
      duration: 40,
      delay: 10,
      path: false,
      reverse: true,
    },
  ];

  return (
    <TechOrbitDisplay iconsArray={clothingIcons} text={text} />
  );
});

// ==================== Exports ====================

export {
  AnimatedInput,
  BoxReveal,
  Ripple,
  OrbitingCircles,
  TechOrbitDisplay,
  AnimatedForm,
  ClothingOrbitDisplay,
  BottomGradient,
};
