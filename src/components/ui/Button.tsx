import React from 'react';
import { cn } from "../../lib/utils";
import { m } from 'framer-motion';

interface ButtonProps {
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  name?: string;
  value?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

type ButtonSize = NonNullable<ButtonProps["size"]>;
type ButtonVariant = NonNullable<ButtonProps["variant"]>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      accent: "btn-accent",
      danger: "btn-danger",
      ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
    };

    return (
      <m.button
        ref={ref}
        className={cn(
          "btn",
          sizeClasses[size as ButtonSize],
          variantClasses[variant as ButtonVariant],
          isLoading && "opacity-70 pointer-events-none",
          className,
        )}
        disabled={isLoading || disabled}
        whileHover={!disabled && !isLoading ? { scale: 1.04, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.97 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={onClick}
        type={type}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </m.button>
    );
  },
);

Button.displayName = "Button";

export default Button;
