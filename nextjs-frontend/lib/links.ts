/** The Search tab doubles as the document reader: `/search?documentId=…` opens a document, and
 * `&section=…` highlights the passage a search hit or an answer source came from. */
export function documentHref(documentId: string, sectionId?: string | null): string {
    const params = new URLSearchParams({ documentId });
    if (sectionId) params.set("section", sectionId);
    return `/search?${params}`;
}
