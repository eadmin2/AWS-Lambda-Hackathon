import React from "react";
import { cn } from "../../lib/utils";
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    const variantClasses = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      accent: "btn-accent",
      danger: "btn-danger",
      ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "btn",
          sizeClasses[size],
          variantClasses[variant],
          isLoading && "opacity-70 pointer-events-none",
          className,
        )}
        disabled={isLoading || disabled}
        whileHover={!disabled && !isLoading ? { scale: 1.04, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.97 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        type={props.type}
        tabIndex={props.tabIndex}
        autoFocus={props.autoFocus}
        name={props.name}
        value={props.value}
        form={props.form}
        formAction={props.formAction}
        formEncType={props.formEncType}
        formMethod={props.formMethod}
        formNoValidate={props.formNoValidate}
        formTarget={props.formTarget}
        id={props.id}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  },
);

Button.displayName = "Button";

export default Button;
