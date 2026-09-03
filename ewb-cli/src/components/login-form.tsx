import { useId, useState, type FormEvent } from "react";
import { Button } from "./button";
import { cx } from "../lib/cx";

export type LoginCredentials = { email: string; password: string };

export type LoginFormProps = {
    /**
     * Receives the entered credentials. May return a promise — the pending state is derived
     * from it, so no `loading` prop is needed for the common case.
     *
     * The retrieval-search backend has no authentication of its own, so this component is
     * deliberately presentational: wiring it to an identity provider is the consumer's job.
     */
    onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
    /** Server-side error to display, e.g. "Invalid credentials". */
    error?: string | null;
    heading?: string;
    submitLabel?: string;
    emailLabel?: string;
    passwordLabel?: string;
    className?: string;
};

type FieldErrors = { email?: string; password?: string };

export function LoginForm({
    onSubmit,
    error = null,
    heading = "Sign in",
    submitLabel = "Continue",
    emailLabel = "Email",
    passwordLabel = "Password",
    className,
}: LoginFormProps) {
    const id = useId();
    const emailId = `${id}-email`;
    const passwordId = `${id}-password`;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (pending) return;

        const errors = validate(email, password);
        setFieldErrors(errors);
        if (errors.email || errors.password) return;

        setPending(true);
        try {
            await onSubmit({ email, password });
        } finally {
            setPending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className={cx("ewb-root", "ewb-login", className)} noValidate>
            <h2 className="ewb-login__heading">{heading}</h2>

            <Field
                id={emailId}
                label={emailLabel}
                type="email"
                autoComplete="username"
                value={email}
                onChange={setEmail}
                error={fieldErrors.email}
                disabled={pending}
            />
            <Field
                id={passwordId}
                label={passwordLabel}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                error={fieldErrors.password}
                disabled={pending}
            />

            {error && (
                <p className="ewb-login__error" role="alert">
                    {error}
                </p>
            )}

            <Button type="submit" loading={pending} className="ewb-login__submit">
                {submitLabel}
            </Button>
        </form>
    );
}

function Field({
    id,
    label,
    type,
    autoComplete,
    value,
    onChange,
    error,
    disabled,
}: {
    id: string;
    label: string;
    type: string;
    autoComplete: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled: boolean;
}) {
    const errorId = `${id}-error`;
    return (
        <div className="ewb-field">
            <label htmlFor={id} className="ewb-label">
                {label}
            </label>
            <input
                id={id}
                type={type}
                autoComplete={autoComplete}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cx("ewb-input", error && "ewb-input--invalid")}
            />
            {error && (
                <p id={errorId} className="ewb-field__error">
                    {error}
                </p>
            )}
        </div>
    );
}

function validate(email: string, password: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.trim()) {
        errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Enter a valid email address.";
    }
    if (!password) {
        errors.password = "Password is required.";
    }
    return errors;
}
