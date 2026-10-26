/** A browser localStorage key exposed as a stable useSyncExternalStore source for preferences. */
export type LocalStore<T> = {
    subscribe: (onChange: () => void) => () => void;
    /** Client snapshot. Re-parses only when the underlying string actually changed. */
    getSnapshot: () => T;
    /** Constant, so server render and hydration agree. */
    getServerSnapshot: () => T;
    write: (value: T) => void;
};

export function createLocalStore<T>(
    key: string,
    parse: (raw: string | null) => T,
    serialize: (value: T) => string,
): LocalStore<T> {
    const listeners = new Set<() => void>();
    const empty = parse(null);

    // `undefined` means "not read yet", which is distinct from a key that is absent.
    let lastRaw: string | null | undefined;
    let lastValue: T = empty;
    // Set once a write fails — private browsing, or a full quota. From then on the value
    // is held in memory only, so the page still works for this session.
    let memoryOnly = false;

    function raw(): string | null {
        if (memoryOnly) return lastRaw ?? null;
        try {
            return localStorage.getItem(key);
        } catch {
            memoryOnly = true;
            return lastRaw ?? null;
        }
    }

    function notify() {
        for (const listener of listeners) listener();
    }

    return {
        subscribe(onChange) {
            listeners.add(onChange);
            // Another tab writing the same key: `storage` fires only in *other* tabs,
            // which is exactly the case our own notify() misses.
            const onStorage = (e: StorageEvent) => {
                if (e.key === key || e.key === null) onChange();
            };
            window.addEventListener("storage", onStorage);
            return () => {
                listeners.delete(onChange);
                window.removeEventListener("storage", onStorage);
            };
        },

        getSnapshot() {
            const current = raw();
            if (current !== lastRaw) {
                lastRaw = current;
                lastValue = parse(current);
            }
            return lastValue;
        },

        getServerSnapshot() {
            return empty;
        },

        write(value) {
            const next = serialize(value);
            try {
                localStorage.setItem(key, next);
            } catch {
                memoryOnly = true;
            }
            lastRaw = next;
            lastValue = value;
            notify();
        },
    };
}
