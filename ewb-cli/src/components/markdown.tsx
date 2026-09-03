import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the assistant's streamed markdown output with the library's own class names rather
 * than a `prose` plugin, so every element stays under the `.ewb-*` stylesheet's control.
 *
 * Re-rendering on every streamed chunk is fine: react-markdown reparses on each pass and
 * gracefully handles incomplete syntax (a `**` with no closing yet just renders as text until
 * the closing arrives).
 */
export function Markdown({ children }: { children: string }) {
    return (
        <div className="ewb-md">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children: content }) => (
                        <a href={href} target="_blank" rel="noreferrer">
                            {content}
                        </a>
                    ),
                    table: ({ children: content }) => (
                        <div className="ewb-md__table-wrap">
                            <table>{content}</table>
                        </div>
                    ),
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
